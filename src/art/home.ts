/** IH2-052 original art keys. Geometry here describes drawings, not authority. */
import catalog from '../../public/art/homes/catalog.json' with {type:'json'};
export const HOME_ASSETS=catalog.assets.map(asset=>asset.id);
export const HOME_CATALOG=catalog;
export const HOME_ART={
 starterExterior:'home-starter-exterior',expandedExterior:'home-expanded-exterior',
 starterInterior:'home-starter-interior',expandedInterior:'home-expanded-interior',
 exteriorSize:{width:208,height:248},exteriorFoot:{x:104,y:240},
 interiorDoor:{x:304,y:448},bedBlockedTiles:[2,2,4,3] as const,
 furniture:{
  letterbox:{world:'letterbox-leaf-closed',icon:'letterbox-leaf-closed',width:80,height:112,foot:{x:40,y:106}},
  planter:{world:'home-planter-world',icon:'home-planter-icon',width:64,height:80,foot:{x:32,y:75}},
  stool:{world:'home-stool-world',icon:'home-stool-icon',width:64,height:64,foot:{x:32,y:59}},
  rug:{world:'home-rug-world',icon:'home-rug-icon',width:96,height:64,foot:{x:48,y:32}},
  lamp:{world:'home-lamp-world',icon:'home-lamp-icon',width:64,height:96,foot:{x:32,y:91}},
  crate:{world:'home-crate-world',icon:'home-crate-icon',width:64,height:64,foot:{x:32,y:60}},
  easel:{world:'home-easel-world',icon:'home-easel-icon',width:80,height:112,foot:{x:40,y:106}},
  shelf:{world:'home-shelf-world',icon:'home-shelf-icon',width:80,height:96,foot:{x:40,y:91}}
 },
 materials:{scrap:'home-scrap-icon',timber:'home-timber-icon',supplies:'home-supplies-icon'}
} as const;
