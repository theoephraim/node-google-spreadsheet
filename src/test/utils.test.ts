import { describe, expect, it } from 'vitest';

import { getFieldMask } from '../lib/utils';

describe('utils', () => {
  describe('getFieldMask', () => {
    const cases = [
      {
        expectedMask: 'tabColor',
        fromObj: {
          tabColor: {
            red: 0,
            green: 1,
            blue: 2,
          },
        },
      },
      {
        expectedMask: 'hidden,tabColor',
        fromObj: {
          hidden: false,
          tabColor: {
            red: 0,
            green: 1,
            blue: 2,
          },
        },
      },
      {
        expectedMask: 'hidden,tabColor',
        fromObj: {
          hidden: false,
          gridProperties: {},
          tabColor: {
            red: 0,
            green: 1,
            blue: 2,
          },
        },
      },
      {
        expectedMask: 'gridProperties.colCount,hidden,tabColor',
        fromObj: {
          hidden: false,
          gridProperties: {
            colCount: 78,
          },
          tabColor: {
            red: 0,
            green: 1,
            blue: 2,
          },
        },
      },
      {
        expectedMask: 'gridProperties.colCount,gridProperties.rowCount,hidden,tabColor',
        fromObj: {
          hidden: false,
          gridProperties: {
            colCount: 78,
            rowCount: 14,
          },
          tabColor: {
            red: 0,
            green: 1,
            blue: 2,
          },
        },
      },
      {
        expectedMask: 'gridProperties.colCount,gridProperties.rowCount',
        fromObj: {
          gridProperties: {
            colCount: 78,
            rowCount: 14,
          },
        },
      },
    ];

    cases.forEach((c) => {
      it(c.expectedMask, () => {
        expect(getFieldMask(c.fromObj)).toBe(c.expectedMask);
      });
    });
  });
});
