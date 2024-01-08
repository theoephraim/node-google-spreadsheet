import {getFieldMask} from "../lib/utils";

describe('utils', () => {
    describe('getFieldMask', () => {
        const cases = [
            ['tabColor', {
                tabColor: {
                    red: 0,
                    green: 1,
                    blue: 2,
                },
            }],
            ['hidden,tabColor', {
                hidden: false,
                tabColor: {
                    red: 0,
                    green: 1,
                    blue: 2,
                },
            }],
            ['hidden,tabColor', {
                hidden: false,
                gridProperties: {},
                tabColor: {
                    red: 0,
                    green: 1,
                    blue: 2,
                },
            }],
            ['gridProperties.colCount,hidden,tabColor', {
                hidden: false,
                gridProperties: {
                    colCount: 78,
                },
                tabColor: {
                    red: 0,
                    green: 1,
                    blue: 2,
                },
            }],
            ['gridProperties.colCount,gridProperties.rowCount,hidden,tabColor', {
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
            }],
            ['gridProperties.colCount,gridProperties.rowCount', {
                gridProperties: {
                    colCount: 78,
                    rowCount: 14,
                },
            }],
        ];

        test.each(cases)('%s', (expected, from) => {
            expect(getFieldMask(from)).toBe(expected);
        })
    });
});