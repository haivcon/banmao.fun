'use strict';

// Solidity source generation only. SVG tags and their order are never normalized.
const CONCAT_ARITY = 5;
const MIN_SHARED_TAG_LENGTH = 65;

function concatExpression(parts, arity = CONCAT_ARITY) {
  if (!Number.isInteger(arity) || arity < 2) throw new RangeError('Concat arity must be an integer >= 2');
  let level = parts;
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += arity) {
      const chunk = level.slice(i, i + arity);
      next.push(chunk.length === 1 ? chunk[0] : `string.concat(${chunk.join(',')})`);
    }
    level = next;
  }
  return level[0] || '""';
}

function svgTokens(svg) {
  return svg.match(/<[^>]+>|[^<]+/g) || [];
}

// Helpers are scoped to each contract: equal helper numbers in different
// contracts do NOT imply equal artwork. Preserve first-seen ordering.
function contract(name, entries) {
  const counts = new Map();
  for (const [, svg] of entries) {
    for (const tag of svgTokens(svg)) counts.set(tag, (counts.get(tag) || 0) + 1);
  }
  const shared = [...counts]
    .filter(([tag, count]) => count > 1 && tag.length > MIN_SHARED_TAG_LENGTH)
    .map(([tag]) => tag);
  const index = new Map(shared.map((tag, i) => [tag, i]));

  function expression(svg) {
    const parts = [];
    let literal = '';
    for (const tag of svgTokens(svg)) {
      if (index.has(tag)) {
        if (literal) parts.push(JSON.stringify(literal));
        literal = '';
        parts.push(`_s${index.get(tag)}()`);
      } else {
        literal += tag;
      }
    }
    if (literal) parts.push(JSON.stringify(literal));
    return concatExpression(parts);
  }

  return `contract ${name} {
    error InvalidTrait();

    // Trait dispatch: preserve IDs and the exact authored SVG byte sequence.
    function render(uint8 id) external pure returns(string memory){
${entries.map(([id, svg]) => `        if(id==${id})return ${expression(svg)};`).join('\n')}
        revert InvalidTrait();
    }

    // Interned SVG fragments, local to this contract.
${shared.map((tag, i) => `    function _s${i}() private pure returns(string memory){return ${JSON.stringify(tag)};}`).join('\n')}
}
`;
}

module.exports = { concatExpression, contract };
