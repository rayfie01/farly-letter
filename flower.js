import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Deterministic variation keeps the same flower across visits.
let seed = 84;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

function petalMaps() {
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 1024);
  gradient.addColorStop(0, '#f0b6c7');
  gradient.addColorStop(.4, '#c66891');
  gradient.addColorStop(.8, '#843457');
  gradient.addColorStop(1, '#43132f');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 50; i++) {
    const x = i * 5.3;
    ctx.strokeStyle = `rgba(90,35,120,${.025 + random()*.055})`;
    ctx.lineWidth = .5 + random()*1.2;
    ctx.beginPath(); ctx.moveTo(128+(x-128)*.35,1024);
    ctx.bezierCurveTo(x,700,x+Math.sin(i)*8,300,x,0); ctx.stroke();
  }
  for (let i=0;i<18000;i++) {
    ctx.fillStyle = random() > .5 ? 'rgba(255,240,255,.06)' : 'rgba(75,22,97,.035)';
    ctx.fillRect(random()*256,random()*1024,.6+random(),.8+random()*2);
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  const relief = document.createElement('canvas'); relief.width=256; relief.height=1024;
  const bump = relief.getContext('2d'); bump.fillStyle='#888'; bump.fillRect(0,0,256,1024);
  for(let i=0;i<32;i++) {
    bump.strokeStyle=i%2?'#aaa':'#666'; bump.lineWidth=1.5;
    bump.beginPath(); bump.moveTo(128+(i*8-128)*.35,1024);
    bump.bezierCurveTo(i*8,650,i*8+4,320,i*8,0); bump.stroke();
  }
  return {map,bumpMap:new THREE.CanvasTexture(relief)};
}

function petalPoint(u,v,length,width,curl,phase) {
  const profile = Math.pow(Math.sin(Math.PI*v), .43);
  return new THREE.Vector3(
    u*width*profile,
    v*length,
    .10*Math.sin(v*Math.PI) + curl*v*v + .26*u*u*profile + .018*Math.sin(v*15+phase)*Math.abs(u)*profile
  );
}

function petalGeometry(length,width,curl,phase) {
  const positions=[],uvs=[],indices=[];
  const rows=36, cols=10;
  for(let y=0;y<=rows;y++) for(let x=0;x<=cols;x++) {
    const v=y/rows,u=x/cols*2-1,p=petalPoint(u,v,length,width,curl,phase);
    positions.push(p.x,p.y,p.z); uvs.push(x/cols,v);
  }
  for(let y=0;y<rows;y++) for(let x=0;x<cols;x++) {
    const a=y*(cols+1)+x,b=a+cols+1; indices.push(a,a+1,b,a+1,b+1,b);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export class FlowerScene {
  constructor(container, fallback) {
    this.container=container; this.fallback=fallback; this.rotation=0; this.targetRotation=0;
    this.motion=true; this.visible=true; this.frame=0; this.lastTime=0;
    this.scene=new THREE.Scene();
    this.camera=new THREE.PerspectiveCamera(34,1,.1,30);
    this.camera.position.set(0,.4,6.8); this.camera.lookAt(0,.35,0);
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));
    this.renderer.setClearColor(0x000000,0);
    this.renderer.toneMapping=THREE.ACESFilmicToneMapping; this.renderer.toneMappingExposure=1.05;
    container.append(this.renderer.domElement);
    const generator=new THREE.PMREMGenerator(this.renderer);
    const room=new RoomEnvironment();
    this.environment=generator.fromScene(room,.04);
    this.scene.environment=this.environment.texture;
    this.scene.environmentIntensity=.22;
    room.dispose(); generator.dispose();
    this.scene.add(new THREE.HemisphereLight(0xf8dbe7,0x11070e,.55));
    const key=new THREE.DirectionalLight(0xffded6,3.4); key.position.set(-3,5,3); this.scene.add(key);
    const rim=new THREE.DirectionalLight(0xd277a9,2.1); rim.position.set(3,1,-2); this.scene.add(rim);
    this.group=new THREE.Group(); this.scene.add(this.group);
    this.build(); this.bind(); this.resize(); this.requestRender();
  }
  build() {
    const stemMaterial=new THREE.MeshStandardMaterial({color:0x44663b,roughness:.85});
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.04,-1.5,0),new THREE.Vector3(-.05,-.55,0),new THREE.Vector3(.08,.15,0),new THREE.Vector3(0,.85,0)]);
    this.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve,48,.024,10,false),stemMaterial));
    // A hollow vessel with an actual inner wall, lip and base.
    const profile=[new THREE.Vector2(0,-1.62),new THREE.Vector2(.25,-1.62),new THREE.Vector2(.27,-1.58),new THREE.Vector2(.27,-.73),new THREE.Vector2(.25,-.70),new THREE.Vector2(.232,-.73),new THREE.Vector2(.232,-1.56),new THREE.Vector2(0,-1.56)];
    const glass=new THREE.MeshPhysicalMaterial({color:0x90818a,transmission:.35,transparent:true,opacity:.24,roughness:.12,ior:1.46,thickness:.035,envMapIntensity:.15,side:THREE.DoubleSide});
    this.group.add(new THREE.Mesh(new THREE.LatheGeometry(profile,64),glass));
    const water=new THREE.Mesh(new THREE.CylinderGeometry(.228,.228,.48,48),new THREE.MeshPhysicalMaterial({color:0x68766b,transmission:.5,transparent:true,opacity:.15,roughness:.06,ior:1.333,thickness:.45,envMapIntensity:.1}));
    water.position.y=-1.31; this.group.add(water);
    const leaf=new THREE.Mesh(petalGeometry(.53,.10,.06,1),new THREE.MeshStandardMaterial({color:0x526d3b,roughness:.86,side:THREE.DoubleSide}));
    leaf.position.set(0,-.25,0);leaf.rotation.set(.2,0,-.85);this.group.add(leaf);
    const head=new THREE.Group();head.position.set(0,.83,0);head.rotation.set(-.12,-.12,-.08);this.head=head;this.group.add(head);
    const calyx=new THREE.Mesh(new THREE.SphereGeometry(.19,24,16),stemMaterial);calyx.scale.z=.5;calyx.position.z=-.08;head.add(calyx);
    const maps=petalMaps();
    const material=new THREE.MeshPhysicalMaterial({...maps,bumpScale:.025,roughness:.64,sheen:.35,sheenRoughness:.65,sheenColor:0xf0b2cc,side:THREE.DoubleSide});
    const dewMaterial=new THREE.MeshPhysicalMaterial({color:0xffffff,transmission:1,roughness:.025,ior:1.333,thickness:.04,clearcoat:1});
    const dropGeometry=new THREE.SphereGeometry(1,16,12);
    // Graduated, cupped whorls give the bloom the depth of a dahlia.
    for(let ring=0;ring<7;ring++) for(let i=0;i<22-ring*2;i++) {
      const count=22-ring*2;
      const angle=i/count*Math.PI*2+ring*.31+(random()-.5)*.065;
      const length=(1.16-ring*.15)*(.92+random()*.15),width=(.16-ring*.013)*( .9+random()*.2),curl=.06+ring*.028+random()*.055;
      const phase=random()*6;
      const petal=new THREE.Mesh(petalGeometry(length,width,curl,phase),material);
      petal.position.set(Math.cos(angle)*.075,Math.sin(angle)*.075,ring*.12);
      petal.rotation.z=angle-Math.PI/2;
      head.add(petal);
      if(ring<3 && i%7===0) {
        for(let d=0;d<(i%8===0?2:1);d++) {
          const radius=.018+random()*.014;
          const point=petalPoint((random()-.5)*.85,.34+random()*.47,length,width,curl,phase);
          const drop=new THREE.Mesh(dropGeometry,dewMaterial);
          drop.scale.set(radius,radius*1.12,radius*.68);drop.position.copy(point);drop.position.z+=radius*.6;
          petal.add(drop);
        }
      }
    }
    const disk=new THREE.Mesh(new THREE.SphereGeometry(.065,24,16),new THREE.MeshStandardMaterial({color:0x60213d,roughness:.95}));
    disk.scale.z=.8;disk.position.z=.77;head.add(disk);
    const florets=new THREE.InstancedMesh(new THREE.SphereGeometry(1,6,5),new THREE.MeshStandardMaterial({roughness:.92}),420);
    const dummy=new THREE.Object3D(),color=new THREE.Color();
    for(let i=0;i<420;i++) {
      const r=Math.sqrt(i/420)*.188,a=i*2.399963;
      dummy.position.set(Math.cos(a)*r,Math.sin(a)*r,.05+.092*Math.sqrt(1-(r/.195)**2));
      dummy.scale.set(.007+random()*.003,.008+random()*.004,.012+random()*.005);dummy.updateMatrix();florets.setMatrixAt(i,dummy.matrix);
      color.setHSL(i>330?.10:.79,i>330?.58:.18,i>330?.37+random()*.15:.17+random()*.15);florets.setColorAt(i,color);
    }
    // The folded inner petals cover the tiny natural center.
    florets.geometry.dispose(); florets.material.dispose();
  }
  bind() {
    const signal=(this.abort=new AbortController()).signal;
    let pointer=null,lastX=0;
    this.container.addEventListener('pointerdown',e=>{
      if(e.pointerType==='touch'||e.button!==0)return;
      pointer=e.pointerId;lastX=e.clientX;this.container.setPointerCapture(pointer);
    },{signal});
    this.container.addEventListener('pointermove',e=>{
      if(e.pointerId!==pointer)return;
      this.targetRotation+=(e.clientX-lastX)*.009;lastX=e.clientX;this.requestRender();
    },{signal});
    const end=()=>{pointer=null;};
    this.container.addEventListener('pointerup',end,{signal});this.container.addEventListener('pointercancel',end,{signal});
    this.container.addEventListener('lostpointercapture',end,{signal});
    this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();this.dispose();this.fallback();},{signal});
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(this.container);
    this.intersection=new IntersectionObserver(entries=>{this.visible=entries[0].isIntersecting;if(this.visible)this.requestRender();});this.intersection.observe(this.container);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)this.requestRender();},{signal});
  }
  resize() {
    const {clientWidth:w,clientHeight:h}=this.container;if(!w||!h)return;
    this.camera.aspect=w/h;
    this.camera.position.z=Math.max(6.0,4.25/this.camera.aspect);
    this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);this.requestRender();
  }
  rotate(direction) {this.targetRotation+=direction*.28;this.requestRender();}
  setMotion(enabled) {this.motion=enabled;this.requestRender();}
  requestRender() {if(!this.frame&&!this.disposed)this.frame=requestAnimationFrame(t=>this.render(t));}
  render(t) {
    this.frame=0;if(this.disposed||document.hidden||!this.visible){this.lastTime=0;return;}
    const dt=Math.min((t-(this.lastTime||t))/1000,.05);this.lastTime=t;
    this.rotation+= (this.targetRotation-this.rotation)*(1-Math.exp(-10*dt));
    if(!this.motion)this.rotation=this.targetRotation;
    this.group.rotation.y=this.rotation+(this.motion?Math.sin(t*.00035)*.07:0);
    this.head.rotation.z=-.08+(this.motion?Math.sin(t*.00065)*.014:0);
    this.renderer.render(this.scene,this.camera);
    if(this.motion||Math.abs(this.targetRotation-this.rotation)>.001)this.requestRender();
  }
  dispose() {
    this.disposed=true;cancelAnimationFrame(this.frame);this.abort?.abort();this.observer?.disconnect();this.intersection?.disconnect();
    const geometries=new Set(),materials=new Set(),textures=new Set();
    this.scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)materials.add(o.material);});
    materials.forEach(m=>{for(const v of Object.values(m))if(v?.isTexture)textures.add(v);m.dispose();});
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());this.environment?.dispose();this.renderer.dispose();this.renderer.domElement.remove();
  }
}
