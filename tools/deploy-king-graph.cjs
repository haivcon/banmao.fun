'use strict';
// Shared dependency ordering. deploy(name,args) may return an ethers contract
// or an address (production deployers can persist their own transaction journal).
async function deployKingGraph(deploy) {
  const nodes = {};
  const address = value => typeof value === 'string' ? value : value.address;
  async function add(name,args=[]) { const value=await deploy(name,args);nodes[name]=value;return address(value); }
  async function parts(prefix,count) { const result=[];for(let i=0;i<count;i++)result.push(await add(prefix+i));return result; }
  const anatomy=await add('BanmaoKingAnatomyPart');
  const body=await add('BanmaoKingBodyLib',[anatomy]);
  const expression=await add('BanmaoKingExpressionLib',await parts('BanmaoKingExpressionPart',3));
  const accessory=await add('BanmaoKingAccessoryLib',[await add('BanmaoKingRoyalAccessory'),await add('BanmaoKingAccessoryExpansion')]);
  const background=await add('BanmaoKingBackgroundExpansion',[await parts('BanmaoKingBackgroundExpansionPart',3),await add('BanmaoKingRoyalBackground')]);
  const effects=await add('BanmaoKingBackgroundEffects',[await parts('BanmaoKingBackgroundEffectsPart',3)]);
  const motion0=await add('BanmaoKingMotionPart0'),motion1=await add('BanmaoKingMotionPart1');
  const secondary=await add('BanmaoKingSecondaryMotion',[await parts('BanmaoKingSecondaryMotion',21)]);
  const upgrade=await add('BanmaoKingArtUpgrade'),rays=await add('BanmaoKingDiamondRays');
  const rendererArgs=[body,expression,accessory,background,motion0,motion1,secondary,upgrade,effects,rays];
  await add('BanmaoKingRenderer',rendererArgs);
  return {nodes,rendererArgs,renderer:nodes.BanmaoKingRenderer,body:nodes.BanmaoKingBodyLib,expression:nodes.BanmaoKingExpressionLib,accessory:nodes.BanmaoKingAccessoryLib};
}
module.exports={deployKingGraph};
