import rig from './neutral-rig.json';
// Compatibility argument is ignored: token IDs no longer select body poses.
export function actionPoseSvg(_id = 0): string { return rig.rear; }
export function frontPawsSvg(_id = 0): string { return rig.front; }
