# Paging and state

Control paging and serialize table state.

[Back to @rivinia/table README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/table/v1.0.1/projects/table/README.md)

## Paging and state

`page`, `pageSize`, `sorting`, `filters` and `globalSearch` are writable
signals; `rows` (filtered and sorted), `pageRows` (sliced) and `total` are
read-only computeds. `table.state` is the serialisable slice — put it in the URL
and the user can share what they see; `setState()` and `resetState()` restore it.
