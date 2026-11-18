"""Generate original procedural GLB fixtures, no external model/assets. CC0."""
import json, struct, zlib
from pathlib import Path
root=Path(__file__).parent
faces=[([(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)],(1,0,0)),([(-1,-1,1),(-1,1,1),(-1,1,-1),(-1,-1,-1)],(-1,0,0)),([(-1,1,1),(1,1,1),(1,1,-1),(-1,1,-1)],(0,1,0)),([(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)],(0,-1,0)),([(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)],(0,0,1)),([(1,-1,-1),(-1,-1,-1),(-1,1,-1),(1,1,-1)],(0,0,-1))]
pos=[]; normals=[]; uv=[]; indices=[]
for vertices, normal in faces:
 b=len(pos)//3
 for v in vertices:pos.extend(v);normals.extend(normal)
 uv.extend([0,0,1,0,1,1,0,1]);indices.extend([b,b+1,b+2,b,b+2,b+3])
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
raw=b''.join(b'\x00'+b''.join(bytes((240,100,45,255) if (x//2+y//2)%2 else (30,125,220,255)) for x in range(8)) for y in range(8))
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',8,8,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw))+chunk(b'IEND',b'')
parts=[struct.pack('<'+'f'*len(pos),*pos),struct.pack('<'+'f'*len(normals),*normals),struct.pack('<'+'f'*len(uv),*uv),struct.pack('<'+'H'*len(indices),*indices),png]
binary=b''; views=[]
for part in parts:
 views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(part)})
 binary+=part;binary+=b'\x00'*((-len(binary))%4)
doc={'asset':{'version':'2.0','generator':'Face Studio original procedural test fixture'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'mesh':0,'name':'CalibrationCube','translation':[2,1,-1],'scale':[1,1.5,.75]}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TEXCOORD_0':2},'indices':3,'material':0}]}],'buffers':[{'byteLength':len(binary)}],'bufferViews':views,'accessors':[{'bufferView':0,'componentType':5126,'count':24,'type':'VEC3','min':[-1,-1,-1],'max':[1,1,1]},{'bufferView':1,'componentType':5126,'count':24,'type':'VEC3'},{'bufferView':2,'componentType':5126,'count':24,'type':'VEC2'},{'bufferView':3,'componentType':5123,'count':36,'type':'SCALAR'}],'materials':[{'pbrMetallicRoughness':{'baseColorTexture':{'index':0},'metallicFactor':0,'roughnessFactor':.7}}],'textures':[{'source':0}],'images':[{'bufferView':4,'mimeType':'image/png'}]}
def save(name,d):
 j=json.dumps(d,separators=(',',':')).encode();j+=b' '*((-len(j))%4)
 body=struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
 (root/name).write_bytes(struct.pack('<III',0x46546c67,2,12+len(body))+body)
save('calibration.glb',doc)
original_binary=binary
binary=binary[:views[4]['byteOffset']]+b'X'*(len(binary)-views[4]['byteOffset'])
save('broken-texture.glb',doc)
binary=original_binary
doc['nodes'][0]['translation']=[200,100,-50];doc['nodes'][0]['scale']=[10,30,20];save('large-transformed.glb',doc)
doc['images']=[{'uri':'https://example.invalid/texture.png'}];save('external-resource.glb',doc)
print('Generated 4 original fixtures')
