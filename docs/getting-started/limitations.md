
## Google's API Limitations

Google's API is somewhat limiting. Calls are made to two differently designed APIs, one made to deal with cells, and one to deal with rows. These APIs will let you manage the data in your sheets, but you cannot make any modifications to the formatting of the cells.

### Row-Based API Limitations

The row-based API assumes that the "header row" (first row) of your sheet is set. They have limitations on the column names they will accept - all lowercase with no symbols or spaces. If the values in your sheet do not follow their rules, their API will adapt the key it actually returns to you. I recommend just following their rules to avoid confusion.

You _can_ set a formula value into a cell using the row-based API, but when reading rows, you cannot access the formula, or even be aware that there is one in the cell. Any cells with formulas will return the calculated value of the formula. If you try to update a row, the cell with a formula will be overwritten to its calculated value.

**IMPORTANT** The row-based API also assumes there are no empty rows in your sheet. If any row is completely empty, you will not be able to access any rows after the empty row using the row-based API.


### Limitations

Google's sheets v3 API supported "row-based feeds" natively and so supported the concept of rows a bit better.

- If you want to pull rows sorted by a column, you must actually update the sorting in the document
- You must ensure there are no empty rows - an empty row is treated as the end of the data

