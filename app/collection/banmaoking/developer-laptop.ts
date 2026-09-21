import { utils } from 'ethers';

// World-space wrapper: never nest beneath character/action/volume transforms.
export const LAPTOP_FLOAT_OPEN = '<g data-laptop-float="independent" transform="translate(0 0)"><animateTransform attributeName="transform" type="translate" values="0 0;2 -8;0 0;-2 5;0 0" keyTimes="0;.25;.5;.75;1" calcMode="spline" keySplines=".42 0 .58 1;.42 0 .58 1;.42 0 .58 1;.42 0 .58 1" dur="4.8s" repeatCount="indefinite"/>';

export function floatingDeveloperLaptop(shell: string, tokenId: number | bigint): string {
  return LAPTOP_FLOAT_OPEN + shell + developerLaptopCode(tokenId) + '</g>';
}

// Must match BanmaoKingLaptopCode: packed ASCII domain followed by uint256.
export function developerLaptopCode(tokenId: number | bigint): string {
  if (typeof tokenId === 'number' && (!Number.isSafeInteger(tokenId) || tokenId < 0)) throw new RangeError('Invalid laptop token ID');
  const id = BigInt(tokenId);
  if (id < BigInt(0) || id >= (BigInt(1) << BigInt(256))) throw new RangeError('Invalid laptop token ID');
  const variant = Number(BigInt(utils.solidityKeccak256(['string', 'uint256'], ['developer-laptop-v1', id.toString()])) % BigInt(4));
  const calls = ['mint', 'verify', 'deploy', 'build'];
  const ends = ['show(nft);', 'assert(ok);', 'run(app);', 'ship(pkg);'];
  const names = ['nft', 'ok', 'app', 'pkg'];
  const lines = [`const id=${id};`, `const ${names[variant]}=${calls[variant]}(id);`, ends[variant]];
  const colors = ['#b9a3e8', '#67dceb', '#60efc4'];
  const values = ['.2;.95;.95;.2', '.2;.2;.95;.95;.2', '.2;.2;.95;.95;.2'];
  const times = ['0;.12;.9;1', '0;.12;.28;.9;1', '0;.28;.44;.9;1'];
  return '<g data-laptop-screen="code" font-family="monospace" font-size="5.5" font-weight="500">' + lines.map((line, i) => `<text data-laptop-code="true" x="226" y="${353 + i * 10}" fill="${colors[i]}" opacity=".85"${line.length > 25 ? ' textLength="84" lengthAdjust="spacingAndGlyphs"' : ''}>${line}<animate attributeName="opacity" values="${values[i]}" keyTimes="${times[i]}" dur="6s" repeatCount="indefinite"/></text>`).join('') + '</g>';
}
