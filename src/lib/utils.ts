import * as _ from './toolkit';

export function getFieldMask(obj: Record<string, unknown>) {
  let fromGrid = '';
  const fromRoot = Object.keys(obj).filter((key) => key !== 'gridProperties').join(',');

  if (obj.gridProperties) {
    fromGrid = Object.keys(obj.gridProperties).map((key) => `gridProperties.${key}`).join(',');
    if (fromGrid.length && fromRoot.length) {
      fromGrid = `${fromGrid},`;
    }
  }
  return fromGrid + fromRoot;
}

export function columnToLetter(column: number) {
  let temp;
  let letter = '';
  let col = column;
  while (col > 0) {
    temp = (col - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    col = (col - temp - 1) / 26;
  }
  return letter;
}

export function letterToColumn(letter: string) {
  let column = 0;
  const { length } = letter;
  for (let i = 0; i < length; i++) {
    column += (letter.charCodeAt(i) - 64) * 26 ** (length - i - 1);
  }
  return column;
}

export function checkForDuplicateHeaders(headers: string[]) {
  // check for duplicate headers
  const checkForDupes = _.groupBy(headers); // { c1: ['c1'], c2: ['c2', 'c2' ]}
  _.each(checkForDupes, (grouped, header) => {
    if (!header) return; // empty columns are skipped, so multiple is ok
    if (grouped.length > 1) {
      throw new Error(`Duplicate header detected: "${header}". Please make sure all non-empty headers are unique`);
    }
  });
}

