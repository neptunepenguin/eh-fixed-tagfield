// ==UserScript==
// @name        eh-fixed-tagfield
// @namespace   e-hentai
// @description adds a tag field fixed to the browser window
// @include     http://e-hentai.org/g/*
// @include     https://e-hentai.org/g/*
// @include     https://exhentai.org/g/*
// @version     0.1
// @grant       none
// ==/UserScript==
/*
@usage_start

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

TODO: The fetish tag autocomplete needs to understand separation of tags with
commas.  The commas work for voting but do not work for the completion.  In
other words, the completion only works when a single tag is in the field.

KNOWN LIMITATIONS: The code is dependent on the reverse engineering of the
exiting Javascript on the page of an EH gallery.  Changes to the JavaScript
present on the page may break this script.  Best efforts were made to not
interfere with the main tag field, and after testing I could not find any
interference.  Yet my reverse engineering of the code on the page may be
slightly off so bug may appear.

@usage_end

@licstart

eh-fixed-tagfield.user.js - adds a tag field fixed to the browser window

Copyright (C) 2017 Aquamarine Penguin

This JavaScript code is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License (GNU GPL) as published by the
Free Software Foundation, either version 3 of the License, or (at your option)
any later version.

This JavaScript code is distributed WITHOUT ANY WARRANTY; without even the
implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
the GNU GPL for more details.

The full text of the license can be found in the COPYING file.  If you cannot
find this file, see <http://www.gnu.org/licenses/>.

@licend
*/

"use strict";

(function () {
    // positioning of the new element
    var div = document.createElement('div');
    var div_style = 'opacity:0.7;position:fixed;z-index:100;top:0;right:0;';
    div.style = div_style;
    var input = document.getElementById('newtagfield').cloneNode(true);
    input.autocomplete = 'off';  // we have our own
    input.id = 'eh-fixed-tagfield-input';
    div.appendChild(input);
    document.body.appendChild(div);
    // this allows for a TAB to be used to change focus to our new input field
    window.addEventListener('keydown', function(e) {
        if (9 == e.keyCode) { // TAB
            if (input != document.activeElement)
                input.focus();
            e.preventDefault();
        }
    });
    input.addEventListener('keyup', input_bindings);
    // TODO add tagging warning

    // stores a list of all possible autocompletes
    var ac_list = [];

    // performs the special effects of the new input
    function input_bindings(e) {
        if (9 == e.keyCode) {  // TAB
            // push the content through the autocomplete procedure
            e.target.value = autocomplete(e.target.value);
            e.preventDefault();
        } else if (13 == e.keyCode) {  // RETURN
            /* Uses the EH function to perform the API call that tags the
             * gallery, the call already updates the tag pane.  The issue may
             * be that it is a dependency on EH code. */
            send_vote(input.value, 1);
            input.value = '';
            ac_list = [];
            e.preventDefault();
        } else {
            // we are not tabbing anymore, so clear the list of matches
            ac_list = [];
        }
    }

    /* Performs a crude autocomplete, currently works for a single word only.
     * In the future we should bind another procedure that will separate the
     * input into words (separated by commas), and match only the last one.
     * */
    function autocomplete(text) {
        if ('' == text)  // nothing to do
            return '';
        if (0 < ac_list.length)  // we still have matches give another one
            return ac_list.pop();
        // otherwise we will need to actually perform the matches
        var clean = text.toLowerCase().replace(/[;',."-+=]/, ':');
        var fil = function (f) { return 0 == f.indexOf(clean) };
        ac_list = ac_fetish.filter(fil);
        // place the current text at the bottom of the stack so we return to
        // the original state when the full list is poped
        ac_list.unshift(text);
        return ac_list.pop();
    }

    /*
     * And here we have the list of fetish tags (you can add non-fetish ones).
     * There may be some typos here, please report them, also some tags may
     * change the tag synonyms/groups in which case the list may become
     * invalid.  In most cases a line here looks like:
     *
     *  f:official tag, female synonym, m:official tag, male synonym, misc tag
     *
     * where all non-existent parts are omitted.
     *
     * At the end there are some parody and character tags as an example on how
     * you can add the parodies and character you know.  That list is by no
     * means complete and does not attempt to be.  Artists and circles can be
     * added in the same fashion.  According to initial tests the script starts
     * to slow down with a list of about 5000 items, so be careful if you reach
     * that.
     */
    var ac_fetish = [
// age
  'f:age progression', 'm:age progression'
, 'f:age regression', 'm:age regression'
, 'f:milf', 'milf', 'm:dilf', 'dilf'
, 'f:infantilism', 'm:infantilism'
, 'f:lolicon', 'lolicon', 'm:shotacon', 'shotacon'
, 'f:low lolicon', 'low lolicon', 'm:low shotacon', 'low shotacon'
, 'f:old lady', 'gilf', 'm:old man', 'old man'
, 'f:toddlercon', 'toddler', 'm:toddlercon', 'mtoddler'
// body
, 'f:amputee', 'famp', 'm:amputee', 'mamp'
, 'f:body modification', 'bodymod', 'm:body modification'  // old
, 'f:conjoined', 'conjoin', 'm:conjoined'  // old
, 'f:doll joints', 'fdj', 'm:doll joints'  // no male synonym
, 'f:gijinka', 'm:gijinka'
, 'f:inflation', 'inflation', 'm:inflation', 'minflation'
, 'f:invisible', 'finvis', 'm:invisible', 'minvis'
, 'f:multiple arms', 'm:multiple arms'
, 'f:multiple breasts', 'multiboob'
, 'f:multiple nipples', 'm:multiple nipples'
, 'f:multiple penises', 'multidick', 'm:multiple penises'
, 'f:multiple vaginas'
, 'f:muscle', 'fmus', 'm:muscle', 'mmus'
, 'f:muscle growth', 'musclegrowth', 'm:muscle growth'
, 'f:pregnant', 'fpreg', 'm:pregnant', 'mpreg'
, 'f:stretching', 'fstretch', 'm:stretching'
, 'f:tailjob', 'm:tailjob'
, 'f:wings', 'fwings', 'm:wings', 'mwings'
// change
, 'f:absorption', 'fabsorb', 'm:absorption', 'mabsorb'
, 'f:ass expansion', 'm:ass expansion'
, 'f:balls expansions', 'm:balls expansion', 'ball expansion'
, 'f:body swap', 'fbodyswap', 'm:body swap', 'mbody swap', 'body swap'
, 'f:breast expansion', 'fbe'
, 'f:breast reduction'
, 'f:clit growth', 'clit grow'
, 'f:corruption', 'fcorr', 'm:corruption', 'mcorr'
, 'f:dick growth', 'm:dick growth'
, 'm:feminization', 'feminisation'
, 'f:gender bender', 'fgender', 'm:gender bender', 'mgender'
, 'f:growth', 'fgrowth', 'm:growth', 'mgrowth'
, 'f:moral degeneration', 'fmoral', 'm:moral degeneration', 'mmoral'
, 'f:muscle growth', 'm:muscle growth'
, 'f:nipple expansion', 'm:nipple expansion'
, 'f:petrification', 'statue', 'm:petrification'
, 'f:shrinking', 'm:shrinking'  // mleotard!
, 'f:transformation', 'ftrans', 'm:transformation', 'mtrans'
, 'f:weight gain', 'm:weight gain'
// creature/costume
, 'f:alien girl', 'alien girl', 'm:alien', 'malien'
, 'f:angel', 'fangel', 'm:angel', 'mangel'
, 'f:bee girl', 'beegirl'
, 'f:bunny girl', 'bunny girl', 'm:bunny boy', 'bunny boy'
, 'f:catgirl', 'cat girl', 'm:catboy', 'cat boy'
, 'f:centaur', 'm:centaur'
, 'f:cowgirl', 'cow girl', 'm:cowman', 'cow boy'
, 'f:demon girl', 'succubus', 'm:demon', 'incubus'
, 'f:dog girl', 'doggirl', 'm:dog boy', 'dogboy'
, 'f:draenei', 'm:draenei'
, 'f:elf', 'felf', 'm:elf', 'melf'
, 'f:fairy', 'ffairy', 'm:fairy', 'mfairy'
, 'f:fox girl', 'foxgirl', 'm:fox boy', 'foxboy'
, 'f:furry', 'ffurry', 'm:furry', 'm:furry'
, 'f:ghost', 'fghost', 'm:ghost', 'mghost'
, 'f:goblin', 'm:goblin'
, 'f:harpy', 'fharpy', 'm:harpy', 'mharpy'  // wiki only female
, 'f:horse girl', 'm:horse boy'
, 'f:human on furry', 'fhof', 'm:human on furry', 'mhof'
, 'f:insect girl', 'm:insect boy'
, 'f:kappa', 'm:kappa'
, 'f:lizard girl', 'm:lizard guy'
, 'f:mermaid', 'fmermaid', 'm:merman', 'fishman'
, 'm:minotaur', 'minotaur'
, 'f:monoeye', 'm:monoeye'
, 'f:monster girl', 'monstergirl', 'm:monster', 'monster'
, 'f:mouse girl', 'm:mouse boy'
, 'f:oni', 'm:oni'
, 'f:orc', 'forc', 'm:orc', 'morc'
, 'f:pig girl', 'piggirl', 'm:pig man', 'pigman'
, 'f:plant girl', 'plantgirl', 'm:plant boy', 'plantboy'
, 'f:raccoon girl', 'raccoon boy'
, 'f:robot', 'm:robot'
, 'f:shark girl', 'm:shark boy'
, 'f:sheep girl', 'm:sheep boy'
, 'f:slime girl', 'goo girl', 'm:slime boy', 'goo boy'
, 'f:snake girl', 'm:snake boy'
, 'f:spider girl', 'spidergirl'
, 'f:squid girl', 'squidgirl'
, 'f:wolf girl', 'wolfgirl', 'm:wolf boy', 'wolfboy'
, 'yukkuri'  // must be tagged always in misc?
, 'f:zombie', 'm:zombie'
// animal
, 'f:animal on animal', 'm:animal on animal', 'animal on animal'
, 'f:animal on furry', 'm:animal on furry'
, 'f:bear', 'm:bear'
, 'f:camel', 'm:camel'
, 'f:cat', 'm:cat'
, 'f:cow', 'm:bull', 'mcow'  // missing fcow
, 'f:crab', 'fcrab', 'm:crab', 'mcrab'
, 'f:dinosaur', 'fdino', 'm:dinosaur', 'mdino'
, 'f:dog', 'fdog', 'm:dog', 'mdog'
, 'f:dolphin', 'm:dolphin'
, 'f:donkey', 'fdonkey', 'm:donkey', 'mdonkey'
, 'f:dragon', 'm:dragon'
, 'f:eel', 'feel', 'm:eel', 'meel'
, 'f:elephant', 'm:elephant'
, 'f:fish', 'ffish', 'm:fish', 'mfish'
, 'f:fox', 'm:fox'
, 'f:frog', 'm:frog'
, 'f:goat', 'm:goat'
, 'f:gorilla', 'm:gorilla'
, 'f:horse', 'mare', 'm:horse', 'stallion'
, 'f:insect', 'fbug', 'minsect', 'mbug'
, 'f:kangaroo', 'm:kangaroo'
, 'f:lioness', 'm:lion'
, 'f:maggot', 'fmaggot', 'm:maggot', 'mmaggot'
, 'f:monkey', 'fmonkey', 'm:monkey', 'mmonkey'
, 'f:mouse', 'm:mouse'
, 'f:octopus', 'm:squid'
, 'f:ostrich', 'm:ostrich'
, 'f:panther', 'm:panther'
, 'f:pig', 'm:pig', 'mpig'  // missing fpig
, 'f:rabbit', 'bunny', 'm:rabbit', 'm:bunny'
, 'f:raptile', 'frep', 'm:reptile', 'mrep'
, 'f:rhinoceros', 'm:rhinoceros'
, 'f:sheep', 'fsheep', 'm:sheep', 'msheep'  // wiki only female
, 'f:shark', 'm:shark'
, 'f:slug', 'fslug', 'm:slug', 'mslug'
, 'f:snake', 'fsnake', 'm:snake', 'msnake'
, 'f:spider', 'fspider', 'm:spider', 'mspider'
, 'f:tiger', 'm:tiger', 'mtiger'  // missing ftiger
, 'f:turtle', 'fturtle', 'm:turtle', 'mturtle'
, 'f:unicorn', 'm:unicorn'
, 'f:whale', 'm:whale'
, 'f:wolf', 'm:wolf', 'mwolf'  // missing fwolf
, 'f:worm', 'm:worm'
, 'f:zebra', 'm:zebra'
// activity with creatures
, 'f:bestiality', 'fbeast', 'm:bestiality', 'mbeast'
, 'f:low bestiality', 'flowbeast', 'm:low bestiality', 'mlowbeast'
, 'f:necrophilia', 'fnecro', 'm:necrophilia', 'mnecro'
, 'f:slime', 'fslime', 'm:slime', 'mslime'
, 'f:tentacles', 'ftentacle', 'm:tentacles', 'mtentacle'
// height
, 'f:giantess', 'giantess', 'm:giant'
, 'f:midget', 'fmidget', 'm:midget', 'mmidget'
, 'f:minigirl', 'm:miniguy', 'miniboy'
, 'f:tall girl', 'ftall', 'm:tall man', 'mtall'
// skin
, 'f:albino', 'm:albino'
, 'f:body writing', 'fbw', 'm:body writing', 'mbw'
, 'f:body painting', 'fbodypaint', 'm:body painting', 'mbodypaint'
, 'f:crotch tattoo', 'm:crotch tattoo'
, 'f:dark skin', 'fds', 'm:dark skin', 'mds'
, 'f:freckles', 'ffreck', 'm:freckles', 'mfreck'
, 'f:full body tattoo', 'ftattoo', 'm:full body tattoo', 'mtattoo'
, 'f:oil', 'foil', 'm:oil', 'moil'
, 'f:scar', 'fscar', 'm:scar', 'mscar'
, 'f:skinsuit', 'm:skinsuit'
, 'f:sweating', 'fsweat', 'm:sweating', 'msweat'
, 'f:tanlines', 'ftanlines', 'm:tanlines', 'mtanlines'
// weight
, 'f:anorexic'  // no male version
, 'f:bbw', 'bbw', 'm:bbm', 'bbm'  // probably works
, 'f:weight gain', 'm:weight gain'
// head
, 'f:ahegao', 'fahegao', 'm:ahegao', 'mahegao'
, 'f:brain fuck', 'm:brain fuck'
, 'f:cockslapping'  // no male version yet
, 'f:ear fuck'  // no male version yet
, 'f:facesitting', 'm:facesitting'
, 'f:gasmask', 'fgas', 'm:gasmask', 'mgas'  // wiki update
, 'f:hairjob', 'm:hairjob'
, 'f:masked face', 'fmask', 'm:masked face', 'mmask'
, 'f:prehensile hair'  // no male version yet
// mind
, 'f:body swap', 'fbodyswap', 'm:body swap', 'mbodyswap', 'body swap'
, 'f:chloroform', 'fchloro', 'm:chloroform', 'mchloro'
, 'f:corruption', 'fcorr', 'm:corruption', 'mcorr'
, 'f:drugs', 'm:drugs'  // wrong wiki group
, 'f:drunk', 'fdrunk', 'm:drunk', 'mdrunk'
, 'f:emotionless sex', 'femotion', 'm:emotionless sex', 'memotion'
// costume
, 'f:gyaru', 'fkogal', 'm:gyaru-oh', 'mkogal'
// utilities
, 'f:pantyhose'
, 'f:stockings'
, 'f:schoolgirl uniform', 'm:schoolgirl uniform'
, 'f:bondage', 'm:bondage'
, 'f:gag', 'm:gag'
];

})();

// useful to tell us if something blew up
console.log('eh-fixed-tagfield is active');

