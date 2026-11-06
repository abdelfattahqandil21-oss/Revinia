# Design notes

Read date/time design research retained with the consumer docs.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Research notes

The same-panel design follows the sources that were actually inspected for this
work: PrimeNG 22.1.4 (`showTime` in the date panel), ng-zorro 22.1.2
(`nzShowTime` with Today/Now/OK) and Ant Design 6 (`showTime`, `needConfirm`,
`showNow`, time steps). The W3C APG spinbutton pattern supplies the time
keyboard model, and MDN's `<input type="datetime-local">` documents why the
native control is not used (browser-owned display, no locale/zone control).
The pointer tray follows the APG **listbox** pattern (`role="listbox"` /
`role="option"`, `aria-selected`, one roving tab stop); it is a second input
path for the same draft, not a second step or a second popup.
The package follows the brief: **one panel, one value, one commit**.
