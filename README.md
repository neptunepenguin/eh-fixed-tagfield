eh-fixed-tagfield - adds a tag field fixed to the browser window


## Usage

The script (eh-fixed-tagfield.user.js) adds an extra semi-transparent tag field
at the top left corner of the browser window.  The new field will work in the
same way as the tag field at the top of the gallery page but will not change
into buttons to withdraw or downvote.  For downvoting you still need to go to
the main tag field.

Two major design decisions can be seen in the script:

1.  There is an event listener bound to the entire window, which may be
annoying and even conflicting with other scripts.  Yet the code for the handler
is in one place and can be safely commented out, the script works without that
event.  The event exists only for the convenience of using the TAB button to
gain focus to the new tag field.

2.  The autocomplete function uses .indexOf() because it is an incredibly fast
method (no regex matching over a long list) yet it has the bad side that it
does not carry over the case.  This should not be visible since EH tags are all
lowercase and most people would never input upper case letters, yet it may
prove to be a strange behaviour to some.

![Example uage][1]

[1]: https://raw.githubusercontent.com/neptunepenguin/eh-fixed-tag-field/master/screencast.gif

### TODO

The fetish tag autocomplete needs to understand separation of tags with commas.
The commas work for voting but do not work for the completion.  In other words,
the completion only works when a single tag is in the field.

### Known Limitations

The code is dependent on the reverse engineering of the exiting Javascript on
the page of an EH gallery.  Changes to the JavaScript present on the page may
break this script.  Best efforts were made to not interfere with the main tag
field, and after testing I could not find any interference.  Yet my reverse
engineering of the code on the page may be slightly off so bug may appear.

## Copyright

This file is part of eh-fixed-tagfield

Copyright (C) 2017 Neptune Penguin

This JavaScript code is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License (GNU GPL) as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This JavaScript code is distributed WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
the GNU GPL for more details.

The full text of the license can be found in the COPYING file.  If you cannot
find this file, see <http://www.gnu.org/licenses/>.

