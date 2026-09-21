// Addresses matched against the 95-contract deployment manifest for this collection.
export const KING_CONTRACTS = [
  {
    "name": "BanmaoKingNFT",
    "address": "0x02559c97be39a895E9a9c6D54A30926cb3836666",
    "reused": false,
    "functions": [
      "mint",
      "mintBatch",
      "mintBatchMulti",
      "mintBatchTo",
      "refreshMetadata",
      "traits",
      "tokenURI",
      "renderSVG",
      "supportsInterface"
    ],
    "dependencies": [
      "BanmaoKingRenderer"
    ],
    "category": "NFT"
  },
  {
    "name": "BanmaoKingRenderer",
    "address": "0xD8b9E88D12142bab2C234056Ebf8149F91046666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "tokenURI",
      "renderSVG",
      "miniTraits",
      "renderAttributes"
    ],
    "dependencies": [
      "BanmaoKingIdentityPart1",
      "BanmaoKingExpressionPart9",
      "BanmaoKingMotionPart24",
      "BanmaoKingBackgroundLib",
      "BanmaoKingIdentityPart3",
      "BanmaoKingMotionPart1",
      "BanmaoKingMotionPart2",
      "BanmaoKingIdentityPart2",
      "BanmaoKingAccessoryLib",
      "BanmaoKingBodyArtwork8",
      "BanmaoKingBodyLib",
      "BanmaoKingExpressionLib"
    ],
    "category": "Renderer"
  },
  {
    "name": "BanmaoKingBodyPart1",
    "address": "0x687F7a46d8eF37f9305eF7aFad7C8551FaAF6666",
    "reused": false,
    "functions": [
      "actionPose",
      "frontPaws"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart2",
    "address": "0xb3E3B91EC38Be1F7e4fAD7912c789FA335eE6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart3",
    "address": "0xC95c05f06542ebb3b7D83714bc8533dcA9976666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyArtwork7",
    "address": "0xc058e8b4Ad8f8c4547B288727eaE3543685B6666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1",
      "fragment2",
      "fragment3",
      "fragment4"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart4",
    "address": "0x0B5A49C68dFc16c30C692BCa64D3ea12915e6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingBodyArtwork7"
    ],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart5",
    "address": "0x5241370DD5E3b69B69f4c8A0f929b789D3996666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart6",
    "address": "0xc4dc70dfdCe143C4c9c6AE8Fb3Ed70480da36666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart7",
    "address": "0xf2F43A452056E32D65B05980043720F063886666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart8",
    "address": "0x0C740ae5666C95e8f70da0b3b522787d93aA6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart9",
    "address": "0x0C131e981DA72C67e6FadcEDBD419EA3E00e6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyPart11",
    "address": "0xF5ac1568d2a24c89Ce33C8eC8438623159e66666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "traitName",
      "render"
    ],
    "dependencies": [
      "BanmaoKingBodyPart1",
      "BanmaoKingBodyPart6",
      "BanmaoKingBodyPart9",
      "BanmaoKingBodyArtwork7"
    ],
    "category": "Body"
  },
  {
    "name": "BanmaoKingBodyLib",
    "address": "0x927d6F4BE10467C3A4c09c05E84Ac1bD27206666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "traitName",
      "render"
    ],
    "dependencies": [
      "BanmaoKingBodyPart11"
    ],
    "category": "Body"
  },
  {
    "name": "BanmaoKingExpressionPart1",
    "address": "0x61c791fD7a0127129D30ddbC7cA43bF413Cb6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionArtwork1",
    "address": "0x5C8030d597ddeC87Aa91786D5d4aD461aF106666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1",
      "fragment2",
      "fragment3",
      "fragment4",
      "fragment5"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart2",
    "address": "0x1B5167e6687037d1be7b0a56B96bC90406026666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingExpressionArtwork1"
    ],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart3",
    "address": "0x29D969Aa88222D949AD3D550d719A5A2fa676666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart4",
    "address": "0x297D25C6E35D0c869Be091cEF913575E6D706666",
    "reused": false,
    "functions": [
      "render",
      "traitName"
    ],
    "dependencies": [
      "BanmaoKingExpressionPart1",
      "BanmaoKingExpressionPart2",
      "BanmaoKingExpressionPart3"
    ],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart6",
    "address": "0xC481A3EE3eaE839891E6eB361a864EaF8eAF6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingExpressionArtwork1"
    ],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart7",
    "address": "0x8bBc5052aE3bC4DDEB25cB6E343036fa12E16666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionPart8",
    "address": "0x18AbaDD57dBF168917B8FBd563C6E7EbA28d6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingExpressionLib",
    "address": "0xE416C9F272Fe3B9c6bd53A150AB9A8d98aB46666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "traitName",
      "render"
    ],
    "dependencies": [
      "BanmaoKingExpressionPart4",
      "BanmaoKingExpressionPart6",
      "BanmaoKingExpressionPart7",
      "BanmaoKingExpressionPart8"
    ],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingAccessoryPart2",
    "address": "0x8cecAAf37D74929B2a4E4700b0AF5DcC8b7F6666",
    "reused": false,
    "functions": [
      "render",
      "renderRear",
      "traitName"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart3",
    "address": "0x09A9805B74FDc4f4d81C79241a9f0E3E8B0e6666",
    "reused": false,
    "functions": [
      "render",
      "renderRear",
      "traitName"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryArtwork8",
    "address": "0x5aea7F88f9482898052dC11260ac7b3fceA96666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1",
      "fragment2",
      "fragment3",
      "fragment4"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart4",
    "address": "0x56754A1074e4d95E97ad1ceaF0db3F30ac1E6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart5",
    "address": "0x7bE1E2db95C45308e20B7500c22DEf08e90B6666",
    "reused": false,
    "functions": [
      "render",
      "renderRear",
      "traitName"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart11",
    "address": "0x0e8807B8e6060e6C7B797FBbc7ed5ba201c86666",
    "reused": false,
    "functions": [
      "renderRear",
      "render"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryArtwork10",
    "address": "0x53E2C906F959266482ff6F3B914981dB9dEd6666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart7",
    "address": "0x2b785C1d34EA521a034F65Ec01283d629fd16666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingAccessoryArtwork10"
    ],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryArtwork7",
    "address": "0x692143D0B7a104f28Cd611b2e867C99e5e0e6666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart8",
    "address": "0xBB849e7c69072Ba52d0b08DB5134AD032a9A6666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "traitName",
      "renderRear",
      "render"
    ],
    "dependencies": [
      "BanmaoKingAccessoryPart7",
      "BanmaoKingAccessoryPart11",
      "BanmaoKingAccessoryPart5",
      "BanmaoKingAccessoryArtwork7"
    ],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart1",
    "address": "0x66af871CDb8ae475F71B383d2f102C8298f26666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart12",
    "address": "0x792474d08a1EC5CD57954cebc3F239AE58526666",
    "reused": false,
    "functions": [
      "bubbles"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart10",
    "address": "0x876cdDA235497F6e5A48E51918051DCAacb76666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryPart9",
    "address": "0x3d586A9BaFFD36C9847E518D91b5d326E6AB6666",
    "reused": false,
    "functions": [
      "composed",
      "world"
    ],
    "dependencies": [
      "BanmaoKingAccessoryPart1",
      "BanmaoKingAccessoryPart12",
      "BanmaoKingAccessoryPart10"
    ],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryArtwork9",
    "address": "0xBe406968774457038a9226B0E5631FBd29356666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingAccessoryLib",
    "address": "0x3738e3e8C5D55C1375bb0971A0fDD49dd8A86666",
    "reused": false,
    "functions": [
      "supportsInterface",
      "traitName",
      "render",
      "renderRear",
      "composed",
      "world"
    ],
    "dependencies": [
      "BanmaoKingAccessoryPart8",
      "BanmaoKingAccessoryPart9",
      "BanmaoKingAccessoryArtwork9"
    ],
    "category": "Accessory"
  },
  {
    "name": "BanmaoKingBackgroundPart5",
    "address": "0x0e333e277EEDabd3f70d1ad9c624481A3ddF6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart6",
    "address": "0x6eDf413073e5b0B11bf9AEB3E62A93E7c87D6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart7",
    "address": "0xa523724f6Ca3162238Ae1a038b65FE580d706666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart13",
    "address": "0x03788C46742404920bB6b774a76b7A3c2A336666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingSharedArtwork2",
    "address": "0xC8aF4663BC02ff9dE34ab5D6d433Bce9B8276666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1"
    ],
    "dependencies": [],
    "category": "Shared"
  },
  {
    "name": "BanmaoKingSharedArtwork3",
    "address": "0x13173CaC1DBd1f8e64E377Df6e4e707904e16666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Shared"
  },
  {
    "name": "BanmaoKingBackgroundPart11",
    "address": "0x237D5828D4F538477D23057095Cd78ec1c686666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingSharedArtwork2",
      "BanmaoKingSharedArtwork3"
    ],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart8",
    "address": "0x06Af8De20b97193d0fDA17C5e5F8C6d45A0D6666",
    "reused": false,
    "functions": [
      "render",
      "traitName"
    ],
    "dependencies": [
      "BanmaoKingBackgroundPart5",
      "BanmaoKingBackgroundPart6",
      "BanmaoKingBackgroundPart7",
      "BanmaoKingBackgroundPart11",
      "BanmaoKingBackgroundPart13"
    ],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundArtwork2",
    "address": "0x2b1Fc8d080547C63539b423eEc1B12f3BD596666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1",
      "fragment2",
      "fragment3",
      "fragment4",
      "fragment5"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart1",
    "address": "0x3cEb8612f41CDe3c006364237105aD659B336666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingBackgroundArtwork2"
    ],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart2",
    "address": "0x27aDb36e05abF84a0Fc2d177Eb1C47b80fb66666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart3",
    "address": "0xA3a43eAccCB86664D4D185c54371e47fC4f86666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart4",
    "address": "0x2921a1D3771aa1d2A47Bc2dD36Fc68E0afB76666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingBackgroundPart1",
      "BanmaoKingBackgroundPart2",
      "BanmaoKingBackgroundPart3"
    ],
    "category": "Background"
  },
  {
    "name": "BanmaoKingMotionPart1",
    "address": "0x720be0e71094B2fe286704dE9008dC6674736666",
    "reused": false,
    "functions": [
      "accessory",
      "background",
      "content",
      "contentFor"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork10",
    "address": "0x8157B740Ca1589EE622f9D64f1CE6ec480CB6666",
    "reused": false,
    "functions": [
      "profile"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart2",
    "address": "0x513B076559d3ED9A9c3eb7A4fB1a95314A9D6666",
    "reused": false,
    "functions": [
      "choreography",
      "actionName",
      "content",
      "contentFor"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork18",
    "address": "0xb2ca9FCD9c5BAD77A3055682D14E48656b476666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart3",
    "address": "0x00a961E9a6938968734042E5a73be1a7321D6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork18"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart4",
    "address": "0xf54FB1122A4158680b644E84B5fE2d0a66C96666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork19",
    "address": "0xc2d6Ea2ac901E16fd32c9694059C193a767e6666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart5",
    "address": "0xffFA748896b8dc466959E8f82395b84ef07e6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork19"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart6",
    "address": "0x86D444ee60d23F4aB9DC67eD1D8A7e0AEFD36666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart7",
    "address": "0x4657EE5b691c829371c8AE4500b6915168676666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork20",
    "address": "0xC5D9F550551B5a17794e9aB656Bc8453868c6666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart8",
    "address": "0x74C7F72adF559c9cC77e97f34591D1fE0aD26666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork20"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart9",
    "address": "0x0B2cEe6283C819D02eCa325aEeC2471eF3336666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart10",
    "address": "0x67Fb7a0B37609bA7B021165EC342A5D7D6526666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork11",
    "address": "0x530F904D8a42077c22d265d829784Db0DFfd6666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart11",
    "address": "0x402244676Fea9C16E4C66EDCEfd38B89A3676666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork11"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart12",
    "address": "0x549A88F2E648C6685E929664E2B0d32e4F4B6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart13",
    "address": "0x044e0eF83E27E8e959C6dBc8A204300271CA6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart14",
    "address": "0xFaeC19D8bd3c15913b973218b0CCC14DF79b6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork12",
    "address": "0x30090CbcBEF7dd4C84d60B5f0F69cBC7ef446666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart15",
    "address": "0x080163f88CAB2d4a58a77730d90825590A726666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork12"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork13",
    "address": "0x9a85e9e2Ab98D5456696468e60078702D5456666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart16",
    "address": "0x70Ed5d79dae4649C857e69750D212795bed56666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork13"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart17",
    "address": "0x55cf8dF9706279053506BA1acfF84D645e6d6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork14",
    "address": "0xCbB34512aa3BA284326D39e44dc1Ad4292196666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart18",
    "address": "0x081Cf65F4BB3ce72A8f1272C1c49E1a663e16666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork14"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork15",
    "address": "0x407fa935941C323d6EA4f2230a779f9359046666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart19",
    "address": "0x2569133AF829487FABcD6C367D56A1EFDeFf6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork15"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork16",
    "address": "0xCdf1312445A8AEB9f129eC027Eff746c411d6666",
    "reused": false,
    "functions": [
      "fragment0",
      "fragment1",
      "fragment2",
      "fragment3"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart20",
    "address": "0x6A620A4b148447bc5CC47A58d1e05707a34D6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork16"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart21",
    "address": "0x4aeC7b396b54Fec556C76D1240DB4529F4246666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart22",
    "address": "0xff29Fd88c97cAC29FDDfBbbA9f284e61F1Fc6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionArtwork17",
    "address": "0x138aBd3989c142B9FCdb99A44411808B8A256666",
    "reused": false,
    "functions": [
      "fragment0"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart23",
    "address": "0xdd6F91663D1B763E7CfAac5d31A060bE46586666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [
      "BanmaoKingMotionArtwork17"
    ],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingMotionPart24",
    "address": "0x6E8FA02e77BF2Eff05B927a76fFe7374e73F6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Motion"
  },
  {
    "name": "BanmaoKingIdentityPart2",
    "address": "0xE2a51f89C4D523D7a95Bfb880dA9F7884AEf6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Identity"
  },
  {
    "name": "BanmaoKingBackgroundPart10",
    "address": "0xEcB28469D805bB9129C954eCf1753332F7E26666",
    "reused": false,
    "functions": [
      "render",
      "traitName"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundPart12",
    "address": "0xc8509B1526B0F6B6aA7C29B46df7617D890A6666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Background"
  },
  {
    "name": "BanmaoKingBackgroundLib",
    "address": "0x62A44246979C79795382329a8BCd7281C9466666",
    "reused": false,
    "functions": [
      "render",
      "traitName",
      "atmosphere",
      "throneLight"
    ],
    "dependencies": [
      "BanmaoKingBackgroundPart10",
      "BanmaoKingBackgroundPart8",
      "BanmaoKingBackgroundPart4",
      "BanmaoKingBackgroundPart12"
    ],
    "category": "Background"
  },
  {
    "name": "BanmaoKingIdentityPart1",
    "address": "0xeE486fA2be5aAF45E233dEA78462075a85196666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Identity"
  },
  {
    "name": "BanmaoKingExpressionPart9",
    "address": "0xAdE18CA607E5cbbD25cCa512e693037570c46666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Expression"
  },
  {
    "name": "BanmaoKingIdentityPart3",
    "address": "0x9Ca43CD64700387bD74DadB84289C858f4c56666",
    "reused": false,
    "functions": [
      "render"
    ],
    "dependencies": [],
    "category": "Identity"
  },
  {
    "name": "BanmaoKingBodyArtwork8",
    "address": "0x19B87DF57d9c11C62877dfE0Cda808b35dDC6666",
    "reused": false,
    "functions": [
      "synchronize"
    ],
    "dependencies": [],
    "category": "Body"
  }
] as const;
