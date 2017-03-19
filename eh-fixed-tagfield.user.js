// ==UserScript==
// @name        eh-fixed-tagfield
// @namespace   e-hentai
// @description adds a tag field fixed to the browser window
// @include     http://e-hentai.org/g/*
// @include     https://e-hentai.org/g/*
// @include     https://exhentai.org/g/*
// @version     0.6
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
    // positioning of the new elements
    var div = document.createElement('div');
    var div_style = 'opacity:0.79;position:fixed;z-index:100;top:0;right:0;';
    div.style = div_style;
    var input = document.getElementById('newtagfield').cloneNode(true);
    if (null == input) {  // sanity check
        console.log('you cannot tag right now, sorry');
        return;
    }
    input.autocomplete = 'off';  // we have our own
    input.id = 'eh-fixed-tagfield-input';
    div.appendChild(input);
    document.body.appendChild(div);
    // this is an element meant to be cloned and cloned over
    var dialog = document.createElement('div');
    var dialog_style = 'opacity:0.79;position:fixed;background-color:#669;';
    dialog_style += 'top:50%;left:50%;transform:translate(-50%,-50%);';
    dialog_style += 'padding:20px;border-radius:3px;border:2px solid white;';
    dialog_style += 'text-align:center;font-size:10pt;';
    dialog.style = dialog_style;
    dialog.style.zIndex = '110';  // just in case
    dialog.style.display = 'none';
    var dialog_id = 'eh-fixed-tagfield-dialog';
    dialog.id = dialog_id;
    document.body.appendChild(dialog);
    // performs the wiki search
    var wk = 'https://ehwiki.org/index.php?title=Special:Search&go=Go&search=';
    // this allows for a TAB to be used to change focus to our new input field
    window.addEventListener('keydown', function(e) {
        if (9 == e.keyCode) { // TAB
            if (input != document.activeElement)
                input.focus();
            e.preventDefault();
        }
    });
    input.addEventListener('keyup', input_bindings);

    /* Shows a dialog for two seconds.  The same dialog is used for a tag
     * through the tag field and for the undo button, the difference is that
     * the undo button itself creates a dialog without yet another undo button.
     * One important thing here to think about is garbage collection: we will
     * remove the entire dialog from the document but if we keep references to
     * some of the elements (in global variables for example), these will not
     * be garbage collected.  Be careful.  */
    function show_taglist(header, footer) {
        window.setTimeout(function() {
            var tag_field = document.getElementById('taglist');
            // something is fucked, bail
            if (null == tag_field)
                return;
            var central = tag_field.cloneNode(true);
            // this is the only safe way to clear text decoration
            var cur_tags = central.getElementsByTagName('a');
            Array.prototype.forEach.call(cur_tags, function (a) {
                a.style.textDecoration = 'none';
            });
            central.style.pointerEvents = 'none';
            central.id = 'eh-fixed-tagfield-central';
            var clone = dialog.cloneNode(false);
            if (null != header)
                clone.appendChild(header);
            clone.appendChild(central);
            if (null != footer)
                clone.appendChild(footer);
            clone.id = 'eh-fixed-tagfield-clone';
            clone.style.display = 'block';
            document.body.appendChild(clone);
            window.setTimeout(function() {
                clone.parentNode.removeChild(clone);
            }, 2000);
        }, 600);
    }

    /* What actually animates the tag field in the middle of the screen is
     * show_taglist() but the tricky part of the undo button happens here.
     * We build the header and footer and pass them to show_taglist(), now the
     * footer is bound to an event where it will redo the voting for the same
     * tag (or tags) and redisplay everything (but the footer itself) again.
     * This makes for a nice undo button.
     *
     * Although all of this is still a hack, if EH takes too long to update the
     * tags wrong things will be shown.  And, moreover, the undo button may
     * send a POST before the original vote is processed if EH takes a very
     * very long time.
     *
     * Also, send_vote() is a procedure from EH itself.  This makes things easy
     * for us since we do not need to deal with the requests directly, on the
     * other hand places a dependency on EH code.  */
    function animate_field(tag) {
        // send the request as soon as possible
        send_vote(tag, 1);
        // header
        var left = document.createTextNode('You have read the wiki for ');
        var right = document.createTextNode(' right?');
        var middle_text = tag.replace(/^.*:/, '');
        var middle = document.createTextNode(middle_text);
        var anchor = document.createElement('a');
        anchor.href = wk + middle_text;
        anchor.target = '_blank';
        anchor.style.textDecoration = 'underline';
        anchor.appendChild(middle);
        var header = document.createElement('h1');
        header.appendChild(left);
        header.appendChild(anchor);
        header.appendChild(right);
        var undo = document.createTextNode('UNDO!');
        var footer = document.createElement('h2');
        footer.appendChild(undo);
        footer.style.cursor = 'pointer';
        footer.addEventListener('click', function() {
            send_vote(tag, -1);
            // if you click too fast this may overlay for a second
            show_taglist(header);
            // try to return focus, may not work sometimes
            input.focus();
        });
        return show_taglist(header, footer);
    }

    /* Performs the same animation as animate_field but for tags that have been
     * obviously mistyped in the tag field.  It does *not* send the vote to EH
     * and warns the user of the typo.
     *
     * Neither the autocomplete list or the input text inside the field shall
     * be cleaned after this animation because it does not mingle in the state
     * of the autocomple.  The user is just warned, he is then free to correct
     * his typo and tag properly.  */
    function animate_bad_tag(bad_tag) {
        var left = document.createTextNode('Oooops, | ');
        var right = document.createTextNode(" | ain't a valid tag.");
        var middle = document.createTextNode(bad_tag);
        var header = document.createElement('h1');
        header.style.color = '#f33';
        header.appendChild(left);
        header.appendChild(middle);
        header.appendChild(right);
        return show_taglist(header);
    }

    // stores a list of all possible autocompletes
    var ac_list = [];

    // performs the special effects of the new input
    function input_bindings(e) {
        // future proofing
        var code = e.keyCode;
        if (undefined == code)
            code = e.key;
        if (9 == code) {  // TAB
            // push the content through the autocomplete procedure
            e.target.value = autocomplete(e.target.value);
            e.preventDefault();
        } else if (13 == code) {  // RETURN
            // perform the API calls and animations
            if ('' == input.value) {
                show_taglist();
            } else {
                var tag_value = good_tag(input.value);
                if (tag_value) {
                    animate_field(tag_value);
                    input.value = '';
                    ac_list = [];
                } else {
                    animate_bad_tag(input.value);
                }
                e.preventDefault();
            }
        } else if (33 == code && !e.ctrlKey) {  // PAGE UP
            // this is nice to have (and does not interrupt tabbing)
            window.scrollBy(0, 128 - window.innerHeight);
        } else if (34 == code && !e.ctrlKey) {  // PAGE DOWN
            // if your screen is smaller than 128 pixels you do not need this
            window.scrollBy(0, window.innerHeight - 128);
        } else if (35 == code) {  // END
            // to the end of document
            window.scrollTo(0, document.body.scrollHeight);
        } else if (36 == code) {  // HOME
            // to the top
            window.scrollTo(0, 0);
        } else {
            // we are not tabbing anymore, so clear the list of matches
            ac_list = [];
        }
    }

    /* helper for matching against the autocomplete list,
     * prevents code duplication  */
    function make_match_clean(text) {
        // the colon (':') is needed here,
        // prevents us from changing a later occurrence of the characters
        return text.toLowerCase().replace(/[:;',."-+=]/, ':');
    }

    /* Performs a crude autocomplete, currently works for a single word only.
     * In the future we should bind another procedure that will separate the
     * input into words (separated by commas), and match only the last one.
     */
    function autocomplete(text) {
        if ('' == text)  // nothing to do
            return '';
        if (0 < ac_list.length)  // we still have matches give another one
            return ac_list.pop();
        // otherwise we will need to actually perform the matches
        var clean = make_match_clean(text);
        var fil = function (f) { return 0 === f.indexOf(clean) };
        ac_list = ac_fetish.filter(fil);
        // gives a behaviour more likely to be expected by the user,
        // since we walk the list in reverse
        ac_list.sort(function (l, r) {
            return (l > r) ? -1 : ((l < r) ? 1 : 0);
        });
        // place the current text at the bottom of the stack so we return to
        // the original state when the full list is poped
        ac_list.unshift(text);
        return ac_list.pop();
    }

    /* Prevents typos from being submitted to EH.  Matches a submitted tag
     * against the autocomplete list for the fetish and misc: namespaces.
     * Character and parody namespaces unfortunately cannot be checked in this
     * way because the list would end too big.
     *
     * To add a new tag into the misc: namespace you need to prefix it with the
     * string "misc:".  The prefix will be removed and the tag will not be
     * checked against the autocomplete list.
     *
     * Also, if there are  commas present in the input then there is nothing we
     * can do about it.  If we meddle with the commas we will not be able to
     * support several tags to be sent at once, which is supported by the main
     * tag field.  */
    function good_tag(text) {
        if (text.match(/^misc:/))
            return text.replace('misc:', '');
        if (text.match(','))  // support for multiple tags
            return text;
        if (text.match(/^r:/) || text.match(/^reclass:/))
            return text;
        if (text.match(/^p:/) || text.match(/^parody:/))
            return text;
        if (text.match(/^c:/) || text.match(/^character:/))
            return text;
        if (text.match(/^g:/) || text.match(/^group:/))
            return text;
        if (text.match(/^a:/) || text.match(/^artist:/))
            return text;
        // otherwise the tag *must* be on the list below
        var clean = make_match_clean(text);
        var fetishes = ac_fetish.filter(function (f) { return clean === f; });
        if (0 < fetishes.length)
            return clean;
        return null;
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
, 'f:toddlercon', 'm:toddlercon'
// body
, 'f:body modification', 'm:body modification'
, 'f:conjoined', 'm:conjoined'
, 'f:doll joints', 'm:doll joints'
, 'f:gijinka', 'm:gijinka'
, 'f:haigure'  // no male version yet
, 'f:inflation', 'inflation', 'm:inflation', 'minflation'
, 'f:invisible', 'finvis', 'm:invisible', 'minvis'
, 'f:multiple arms', 'm:multiple arms'
, 'f:multiple breasts', 'multiboob'  // no male version yet
, 'f:multiple penises', 'multidick', 'm:multiple penises'
, 'f:multiple vaginas'  // no male version yet
, 'f:muscle', 'fmus', 'm:muscle', 'mmus'
, 'f:pregnant', 'fpreg', 'm:pregnant', 'mpreg'
, 'f:stretching', 'fstretch', 'm:stretching', 'mstretch'
, 'f:tailjob', 'm:tailjob'
, 'f:wings', 'fwings', 'm:wings', 'mwings'
// change
, 'f:absorption', 'fabsorb', 'm:absorption', 'mabsorb'
, 'f:ass expansion', 'm:ass expansion'
, 'f:balls expansions', 'm:balls expansion', 'ball expansion'
, 'f:breast expansion', 'm:breast expansion'
, 'f:breast reduction'  // no male version yet
, 'f:clit growth', 'clit grow'  // no male version yet
, 'f:corruption', 'fcorr', 'm:corruption', 'mcorr'
, 'f:dick growth', 'm:dick growth'
, 'm:feminization', 'feminisation'  // male only
, 'f:gender bender', 'fgender', 'm:gender bender', 'mgender'
, 'f:growth', 'fgrowth', 'm:growth', 'mgrowth'
, 'f:moral degeneration', 'fmoral', 'm:moral degeneration', 'mmoral'
, 'f:muscle growth', 'm:muscle growth'
, 'f:nipple expansion'  // no male version yet
, 'f:petrification', 'statue', 'm:petrification'
, 'f:shrinking', 'm:shrinking'
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
, 'f:furry', 'ffurry', 'm:furry', 'mfurry'
, 'f:ghost', 'fghost', 'm:ghost', 'mghost'
, 'f:goblin', 'm:goblin'
, 'f:harpy', 'fharpy', 'm:harpy', 'mharpy'
, 'f:horse girl', 'm:horse boy'
, 'f:human on furry', 'fhof', 'm:human on furry', 'mhof'
, 'f:insect girl', 'm:insect boy'
, 'f:kappa', 'm:kappa'
, 'f:lizard girl', 'm:lizard guy'
, 'f:mermaid', 'fmermaid', 'm:merman', 'fishman'
, 'm:minotaur', 'minotaur'  // male only
, 'f:monoeye', 'm:monoeye'
, 'f:monster girl', 'monstergirl', 'm:monster', 'monster'
, 'f:mouse girl', 'm:mouse boy'
, 'f:oni', 'm:oni'
, 'f:orc', 'forc', 'm:orc', 'morc'
, 'f:pig girl', 'piggirl', 'm:pig man', 'pigman'
, 'f:plant girl', 'plantgirl', 'm:plant boy', 'plantboy'
, 'f:raccoon girl', 'm:raccoon boy'
, 'f:robot', 'm:robot'
, 'f:shark girl', 'm:shark boy'
, 'f:sheep girl', 'm:sheep boy'
, 'f:slime girl', 'goo girl', 'm:slime boy', 'goo boy'
, 'f:snail girl'  // no male version yet
, 'f:snake girl', 'm:snake boy'
, 'f:spider girl', 'spidergirl'  // no male version yet
, 'f:squid girl', 'squidgirl', 'm:squid boy', 'squidboy'
, 'f:squirrel girl', 'm:squirrel boy'
, 'f:vampire', 'm:vampie'
, 'f:wolf girl', 'wolfgirl', 'm:wolf boy', 'wolfboy'
, 'yukkuri'  // genderless, always in misc
, 'f:zombie', 'm:zombie'
// animal
, 'f:animal on animal', 'm:animal on animal', 'animal on animal'
, 'f:animal on furry', 'm:animal on furry'
, 'f:bear', 'm:bear'
, 'f:camel', 'm:camel'
, 'f:cat', 'm:cat'
, 'f:cow', 'fcow', 'm:bull', 'mcow'
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
, 'f:pig', 'fpig', 'm:pig', 'mpig'
, 'f:rabbit', 'bunny', 'm:rabbit', 'm:bunny'
, 'f:raptile', 'frep', 'm:reptile', 'mrep'
, 'f:rhinoceros', 'm:rhinoceros'
, 'f:sheep', 'fsheep', 'm:sheep', 'msheep'
, 'f:shark', 'm:shark'
, 'f:slug', 'fslug', 'm:slug', 'mslug'
, 'f:snake', 'fsnake', 'm:snake', 'msnake'
, 'f:spider', 'fspider', 'm:spider', 'mspider'
, 'f:tiger', 'ftiger', 'm:tiger', 'mtiger'
, 'f:turtle', 'fturtle', 'm:turtle', 'mturtle'
, 'f:unicorn', 'm:unicorn'
, 'f:whale', 'm:whale'
, 'f:wolf', 'fwolf', 'm:wolf', 'mwolf'
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
, 'f:body writing', 'm:body writing'
, 'f:body painting', 'fbodypaint', 'm:body painting', 'mbodypaint'
, 'f:crotch tattoo'  // no male version yet
, 'f:dark skin', 'fds', 'm:dark skin', 'mds'
, 'f:freckles', 'ffreckle', 'm:freckles', 'mfreckle'
, 'f:full body tattoo', 'ftattoo', 'm:full body tattoo', 'mtattoo'
, 'f:oil', 'foil', 'm:oil', 'moil'
, 'f:scar', 'fscar', 'm:scar', 'mscar'
, 'f:skinsuit', 'm:skinsuit'
, 'f:sweating', 'fsweat', 'm:sweating', 'msweat'
, 'f:tanlines', 'ftanlines', 'm:tanlines', 'mtanlines'
// weight
, 'f:anorexic'  // no male version yet
, 'f:bbw', 'bbw', 'm:bbm', 'bbm'
, 'f:ssbbw', 'm:ssbbm'
// head
, 'f:ahegao', 'fahegao', 'm:ahegao', 'mahegao'
, 'f:brain fuck', 'm:brain fuck'
, 'f:cockslapping'  // no male version yet
, 'f:ear fuck'  // no male version yet
, 'f:facesitting', 'm:facesitting'
, 'f:hairjob', 'm:hairjob'
, 'f:masked face', 'fmask', 'm:masked face', 'mmask'
, 'f:prehensile hair'  // no male version yet
// mind
, 'f:body swap', 'fbodyswap', 'm:body swap', 'mbodyswap', 'body swap'
, 'f:chloroform', 'fchloro', 'm:chloroform', 'mchloro'
, 'f:drugs', 'm:drugs'
, 'f:drunk', 'fdrunk', 'm:drunk', 'mdrunk'
, 'f:emotionless sex', 'femotion', 'm:emotionless sex', 'memotion'
, 'f:mind break', 'm:mind break'
, 'f:mind control', 'm:mind control'
, 'f:parasite', 'm:parasite'
, 'f:possession', 'fposs', 'm:possession', 'mposs'
, 'f:shared senses', 'fsharedsense', 'm:shared senses', 'msharedsense'
, 'f:sleeping', 'fsleep', 'm:sleeping', 'msleeep'
// eyes
, 'f:blindfold', 'm:blindfold'
, 'f:dark sclera', 'm:dark sclera'
, 'f:eye penetration', 'feyefuck', 'm:eye penetration', 'meyefuck'
, 'f:first person perspective', 'm:first person perspective'
, 'f:heterochromia', 'm:heterochromia'
, 'f:unusual pupils', 'm:unusual pupils'
// nose
, 'f:nose fuck'  // no male version yet
, 'f:nose hook', 'm:nose hook'
// mouth
, 'f:ball sucking', 'fballsucking', 'm:ball sucking', 'mballsucking'
, 'f:big lips'  // no male version yet
, 'f:blowjob', 'm:blowjob'
, 'f:blowjob face', 'm:blowjob face'
, 'f:braces'  // no male version yet
, 'f:burping', 'fburp', 'm:burping', 'mburp'
, 'f:coprophagia', 'm:coprophagia'
, 'f:cunnilingus'  // no male version yet
, 'f:deepthroat', 'fdeep', 'm:deepthroat', 'mdeep'
, 'f:double blowjob', 'm:double blowjob'
, 'f:foot licking', 'm:foot licking'
, 'f:gag', 'fgag', 'm:gag', 'mgag'
, 'f:gokkun', 'fgokkun', 'm:gokkun', 'mgokkun'
, 'f:kissing', 'fkiss', 'm:kissing', 'mkiss'
, 'f:long tongue', 'flongt', 'm:long tongue', 'mlongt'
, 'f:piss drinking', 'm:piss dringking'
, 'f:rimjob', 'frimjob', 'm:rimjob', 'mrimjob'
, 'f:saliva', 'm:saliva'
, 'f:smoking', 'fsmoke', 'm:smoking', 'msmoke'
, 'f:tooth brushing', 'ftooth', 'm:tooth brushing', 'mtooth'
, 'f:unusual teeth', 'm:unusual teeth'
, 'f:vomit', 'fvomit', 'm:vomit', 'mvomit'
, 'f:vore', 'fvore', 'm:vore', 'mvore'
// neck
, 'f:asphyxiation', 'fstrangle', 'm:asphyxiation', 'mstrangle'
// arms
, 'f:armpit licking', 'm:armpit licking'
, 'f:armpit sex', 'm:armpit sex'
, 'f:fingering'  // male links to prostate massage
, 'f:fisting', 'ffist', 'm:fisting', 'mfist'
, 'f:handjob', 'm:handjob'
, 'f:hairy armpits', 'm:hairy armpits'
// breasts
, 'f:big areolae', 'm:big areolae'
, 'f:big breasts', 'm:big breasts'
, 'f:breast feeding', 'fbreastfeed', 'm:breast feeding', 'mbreastfeed'
, 'f:gigantic breasts', 'm:gigantic breasts'
, 'f:huge breasts', 'fhuge breasts'
, 'f:lactation', 'm:lactation'
, 'f:milking', 'fmilking'  // male links to handjob
, 'f:multiple paizuri'  // no male version yet
, 'f:oppai loli'  // female only
, 'f:paizuri', 'fpai', 'm:paizuri', 'mpai'
, 'f:small breasts', 'small breats'
// nipples
, 'f:big nipples', 'fbignipple', 'm:big nipples', 'mbignipple'
, 'f:dark nipples', 'm:dark nipples'
, 'f:dicknipples', 'm:dicknipples'
, 'f:inverted nipples', 'm:inverted nipples'
, 'f:multiple nipples'  // no male version yet
, 'f:nipple birth', 'fniiplebirth', 'm:nipple birth', 'mnipplebirth'
, 'f:nipple fuck'  // no male version yet
// torso
, 'f:navel fuck', 'm:navel fuck'
, 'f:stomach deformation', 'm:stomach deformation'
// crotch
, 'f:condom', 'fcondom', 'm:condom', 'mcondom'
, 'f:hairy', 'm:hairy'
, 'f:pantyjob', 'm:pantyjob'
, 'f:pubic stubble', 'm:pubic stubble'
, 'f:urethra insertion', 'm:urethra insertion'
// penile
, 'f:balljob', 'm:balljob'
, 'f:big balls', 'fbigballs', 'm:big balls', 'mbigballs'
, 'f:big penis', 'm:big penis'
, 'f:cbt', 'fcbt', 'm:cbt', 'mcbt'
, 'm:cuntboy', 'cunt boy'
, 'f:frottage', 'm:frottage', 'frottage'
, 'f:futanari', 'futanari'  // female only
, 'f:horse cock', 'm:horse cock'
, 'f:huge penis', 'm:huge penis'
, 'f:penis birth', 'fpenisbirth', 'm:penis birth', 'mpenisbirth'
, 'f:phimosis', 'fphimosis', 'm:phimosis', 'mphimosis'
, 'f:prostate massage', 'm:prostate massage'
, 'f:shemale', 'shemale'  // female only
, 'f:smegma', 'fsmegma', 'm:smegma', 'msmegma'
// vaginal
, 'f:big clit'  // no male version yet
, 'f:big vagina'  // no male version yet
, 'f:birth', 'fbirth', 'm:birth', 'mbirth'
, 'f:cervix penetration'  // no male version yet
, 'f:double vaginal'  // no male version yet
, 'f:squirting', 'squirt'  // no male version yet
, 'f:tribadism', 'tribbing'  // no male version yet
, 'f:triple vaginal'  // no male version yet
// buttocks
, 'f:anal', 'fanal', 'm:anal', 'manal'
, 'f:anal birth', 'fanalbirth', 'm:anal birth', 'manalbirth'
, 'f:assjob', 'm:assjob'
, 'f:big ass', 'm:big ass'
, 'f:double anal', 'm:double anal'
, 'f:enema', 'fenema', 'm:enema', 'menema'
, 'f:farting', 'ffart', 'm:farting', 'mfart'
, 'm:pegging'  // male only
, 'f:spanking', 'fspank', 'm:spanking', 'mspank'
, 'f:tail plug', 'm:tail plug'
, 'f:triple anal', 'm:triple anal'
// either hole
, 'f:eggs', 'fegg', 'm:eggs', 'megg'
, 'f:gaping', 'fgape', 'm:gaping', 'mgape'
, 'f:large insertions', 'm:large insertions'
, 'f:nakadashi', 'fcreampie', 'm:nakadashi', 'mcreampie'
, 'f:prolapse', 'fprolapse', 'm:prolapse', 'mprolapse'
, 'f:unbirth', 'funbirth', 'm:unbirth', 'munbirth'
// legs
, 'f:kneepit sex'  // no male version yet
, 'f:leg lock', 'm:leg lock'
, 'f:legjob'  // no male version yet
, 'f:sumata', 'm:sumata'
// feet
, 'f:foot insertion', 'm:foot insertion'
, 'f:footjob', 'm:footjob'
, 'f:sockjob', 'm:sockjob'
// costume
, 'f:apron', 'fapron', 'm:apron', 'mapron'
, 'f:bandages', 'mbandage', 'm:bandages', 'fbandage'
, 'f:bandaid'  // no male version yet
, 'f:bike shorts', 'fspats', 'm:bike shorts', 'mspats'
, 'f:bikini', 'fbikini', 'm:bikini', 'mbikini'
, 'f:bloomers', 'fbloomer', 'm:bloomers', 'mbloomer'
, 'f:bodystocking', 'fbodystocking', 'm:bodystocking', 'mbodystocking'
, 'f:bodysuit', 'fbodysuit', 'm:bodysuit', 'mbodysuit'
, 'f:bride', 'm:bride'
, 'f:business suit', 'm:business suit'
, 'f:butler', 'fbutler', 'm:butler', 'mbutler'
, 'f:cashier', 'facsh', 'm:cashier', 'mcash'
, 'f:chastity belt', 'fcb', 'm:chastity belt', 'mcb'
, 'f:cheerleader', 'fcheer', 'm:cheerleader', 'mcheer'
, 'f:chinese dress', 'm:chinese dress'
, 'f:christmas', 'fchrist', 'm:christmas', 'mchrist'
, 'f:clown', 'm:clown'
, 'f:collar', 'm:collar'
, 'f:corset', 'fcorset', 'm:corset', 'mcorset'
, 'f:cosplaying', 'fcosplay', 'm:cosplaying', 'mcosplay'
, 'f:crossdressing', 'fcross', 'm:crossdressing', 'mcross'
, 'f:diaper', 'm:diaper'
, 'f:dougi', 'fdougi', 'm:dougi', 'mdougi'
, 'f:eyemask', 'feyemask', 'm:eyemask', 'meyemask'
, 'f:eyepatch', 'm:eyepatch'
, 'f:fundoshi', 'ffund', 'm:fundoshi', 'mfund'
, 'f:garter belt', 'fgarter', 'm:garter belt', 'mgarter'
, 'f:gasmask', 'fgas', 'm:gasmask', 'mgas'
, 'f:glasses', 'fglasses', 'm:glasses', 'mglasses'
, 'f:gothic lolita', 'm:gothic lolita'
, 'f:gyaru', 'fkogal', 'm:gyaru-oh', 'mkogal'
, 'f:gymshorts', 'fgymshorts', 'm:gymshorts', 'mgymshorts'
, 'f:hijab'  // no male version yet
, 'f:hotpants', 'fhotpants', 'm:hotpants', 'mhotpants'
, 'f:kigurumi', 'm:kigurumi'
, 'f:kimono', 'fkimono', 'm:kimono', 'mkimono'
, 'f:kindergarten uniform'  // no male version yet
, 'f:kunoichi', 'm:kunoichi'
, 'f:lab coat', 'flab', 'm:lab coat', 'mlab'
, 'f:latex', 'flatex', 'm:latex', 'mlatex'
, 'f:leotard', 'fleotard', 'm:leotard', 'mleotard'
, 'f:lingerie', 'flingerie', 'm:lingerie', 'mlingerie'
, 'f:living clothes', 'm:living clothes'
, 'f:magical girl', 'm:magical girl'
, 'f:maid', 'fmaid', 'm:maid', 'mmaid'
, 'f:mecha girl', 'm:mecha boy'
, 'f:metal armor', 'm:metal armor'
, 'f:miko', 'fmiko', 'm:miko', 'mmiko'
, 'f:military', 'fmilitary', 'm:military', 'mmilitary'
, 'f:nazi', 'm:nazi'
, 'm:ninja'  // female links to kunoichi
, 'f:nun', 'fnun', 'm:nun', 'mnun'
, 'f:nurse', 'fnurse', 'm:nurse', 'mnurse'
, 'f:pantyhose', 'fpantyh', 'm:pantyhose', 'mpantyh'
, 'f:pasties', 'm:pasties'
, 'f:piercing', 'fpiercing', 'm:piercing', 'mpiercing'
, 'f:policewoman', 'm:policeman'
, 'f:ponygirl'  // no male version yet
, 'f:race queen'  // no male version yet
, 'f:randoseru', 'frand', 'm:randoseru', 'mrand'
, 'f:school swimsuit', 'm:school swimsuit'
, 'f:schoolboy uniform', 'fschoolboy', 'm:schoolboy uniform', 'mschoolboy'
, 'f:schoolgirl uniform', 'fschoolgirl', 'm:schoolgirl uniform', 'mschoolgirl'
, 'f:scrotal lingerie', 'm:scrotal lingerie'
, 'f:shimapan', 'fstriped panties', 'm:shimapan', 'mstriped panties'
, 'f:stewardess', 'fstewardess', 'm:stewardess', 'mstewardess'
, 'm:steward'  // no female version yet
, 'f:stockings', 'fstockings', 'm:stockings', 'mstockings'
, 'f:swimsuit', 'fswimsuit', 'm:swimsuit', 'mswimsuit'
, 'f:sundress', 'fsundress', 'm:sundress', 'msundress'
, 'f:sunglasses', 'fsunglass', 'm:sunglasses', 'msunglass'
, 'f:thigh high boots', 'm:thigh high boots'
, 'f:tiara', 'ftiara', 'm:tiara', 'mtiara'
, 'f:tights', 'ftights', 'm:tights', 'mtights'
, 'f:tracksuit', 'm:tracksuit'
, 'f:vaginal sticker'  // no male version yet
, 'f:waiter', 'fwaiter', 'm:waiter', 'mwaiter'
, 'f:waitress', 'fwaitress', 'm:waitress', 'mwaitress'
, 'f:wet clothes', 'm:wet clothes'
, 'f:witch', 'fwitch', 'm:witch', 'mwitch'
// tools
, 'dakimakura', 'body pillow'  // always in misc
, 'f:glory hole', 'fglory', 'm:glory hole', 'mglory'
, 'f:machine', 'fmachine', 'm:machine', 'mmachine'
, 'f:onahole', 'fonahole', 'm:onahole', 'monahole'
, 'f:pillory', 'fpillory', 'm:pillory', 'mpillory'
, 'f:pole dancing', 'fpole', 'm:pole dancing', 'mpole'
, 'f:real doll'  // no male version yet
, 'f:sex toys', 'm:sex toys'
, 'f:speculum', 'fspec', 'm:speculum', 'mspec'
, 'f:strap-on'  // no male version yet
, 'f:syringe', 'fsyringe', 'm:syringe', 'msyringe'
, 'f:tube', 'ftube', 'm:tube', 'mtube'
, 'f:vacbed', 'm:vacbed'
, 'f:whip', 'fwhip', 'm:whip', 'mwhip'
, 'f:wooden horse', 'fwooden', 'm:wooden horse', 'mwooden'
, 'f:wormhole', 'fwormhole', 'm:wormhole', 'mwormhole'
, 'f:x-ray', 'fxray', 'm:x-ray', 'mxray'
// fluids
, 'f:bukkake', 'fbukkake', 'm:bukkake', 'mbukkake'
, 'f:cum bath'  // no male version yet
, 'f:cum in eye'  // no male version yet
, 'f:cum swap'  // no male version yet
, 'f:menstruation'  // no male version yet
, 'f:public use', 'm:public use'
, 'f:scat', 'fscat', 'm:scat', 'mscat'
, 'f:smell', 'fsmell', 'm:smell', 'msmell'
, 'f:underwater', 'm:underwater'
, 'f:urination', 'fpee', 'm:urination', 'mpee'
// force
, 'f:bdsm', 'fbsdm', 'm:bdsm', 'mbdsm'
, 'f:bondage', 'fbondage', 'm:bondage', 'mbondage'
, 'f:chikan', 'fchikan', 'm:chikan', 'mchikan'
, 'f:femdom', 'femdom', 'm:josou seme', 'trapdom'
, 'f:forniphilia', 'fforn', 'm:forniphilia', 'mforn'
, 'f:human cattle'  // no male version yet
, 'f:human pet', 'pergirl', 'm:human pet', 'petgirl'
, 'f:orgasm denial', 'm:orgasm denial'
, 'f:rape', 'frape', 'm:rape', 'mrape'
, 'f:shibari', 'fshibari', 'm:shibari', 'mshibari'
, 'f:slave', 'fslave', 'm:slave', 'mslave'
, 'f:stuck in wall', 'fstuck', 'm:stuck in wall', 'mstuck'
, 'f:tickling', 'ftickle', 'm:tickling', 'mtickle'
, 'time stop'  // always in misc
// violence
, 'f:abortion', 'fabort', 'm:abortion', 'mabort'
, 'f:blood', 'fblood', 'm:blood', 'mblood'
, 'f:cannibalism', 'fcann', 'm:cannibalism', 'mcann'
, 'f:catfight'  // female only
, 'f:guro', 'fguro', 'm:guro', 'mguro'
, 'f:electric shocks', 'm:electric shocks'
, 'f:ryona', 'ffight', 'm:ryona', 'mfight'
, 'f:snuff', 'fsnuff', 'm:snuff', 'msnuff'
, 'f:torture', 'm:torture'
, 'f:trampling', 'ftramp', 'm:trampling', 'mtramp'
, 'f:wrestling', 'm:wrestling'
// self-pleasure
, 'f:autofellatio', 'm:autofellatio'
, 'f:autopaizuri'  // no male version yet
, 'f:masturbation', 'fmast', 'm:masturbation', 'mmast'
, 'f:phone sex', 'm:phone sex'
, 'f:selfcest', 'm:selfcest'
, 'f:solo action', 'fsolo', 'm:solo action', 'msolo'
, 'f:table masturbation', 'm:table masturbation'
// disability
, 'f:amputee', 'famp', 'm:amputee', 'mamp'
, 'f:blind', 'fblind', 'm:blind', 'mblind'
, 'f:handicapped'  // no male version yet
, 'f:mute'  // no male version yet
// privacy
, 'f:exhibitionism', 'm:exhibitionism'
, 'f:filming', 'ffilm', 'm:filming', 'mfilm'
, 'f:humiliation', 'fhumiliation', 'm:humiliation', 'mhumiliation'
, 'f:voyeurism', 'm:voyeurism'
// group activities
, 'f:bisexual', 'm:bisexual'
, 'ffm threesome', 'mff threesome', 'fmf threesome'
, 'f:fft threesome', 'fft threesome', 'tff threesome', 'ftf threesome'
, 'f:group', 'fgroup', 'm:group', 'mgroup', 'group'
, 'f:harem', 'fharem', 'm:harem', 'mharem'
, 'f:layer cake', 'm:layer cake'
, 'mmf threesome', 'fmm threesome'
, 'mmt threesome', 'tmm threesome', 'mtm threesome'
, 'mtf threesome', 'fmt threesome', 'ftm threesome', 'mft threesome'
, 'f:ttf threesome', 'ttf threesome', 'ftt threesome', 'tft threesome'
, 'ttm threesome', 'mtt threesome', 'tmt threesome'
, 'f:twins', 'ftwins', 'm:twins', 'mtwins', 'twins'
// multiple holes
, 'f:all the way through', 'm:all the way through'
, 'f:double penetration', 'm:double penetration'
, 'f:triple penetration', 'm:triple penetration'
// inter-gender
, 'f:dickgirl on dickgirl', 'dickgirl on dickgirl'
, 'm:dickgirl on male', 'dickgirl on male'
, 'f:male on dickgirl', 'male on dickgirl'
// contextual
, 'f:blackmail', 'fblackmail', 'm:blackmail', 'mblackmail'
, 'f:coach', 'fcoach', 'm:coach', 'mcoach'
, 'f:defloration', 'm:virginity'
, 'f:females only', 'girls only', 'm:males only', 'guys only'
, 'f:impregnation', 'fimpreg', 'm:impregnation', 'mimpreg'
, 'f:oyakodon', 'm:oyakodon', 'oyakodon'
, 'f:prostitution', 'fprost', 'm:prostitution', 'mprost'
, 'f:sole dickgirl', 'sole dickgirl'
, 'f:sole female', 'sole female'
, 'm:sole male', 'sole male'
, 'f:teacher', 'fteacher', 'm:teacher', 'mteacher'
, 'f:tomboy', 'tomboy', 'm:tomgirl', 'tomgirl'
, 'f:tutor', 'ftutor', 'm:tutor', 'mtutor'
, 'f:widow', 'm:widower'
, 'f:yandere', 'fyandere', 'm:yandere', 'myandere'
, 'f:yuri', 'm:yaoi'
// infidelity
, 'f:cheating', 'fcheat', 'm:cheating', 'mcheat'
, 'f:netorare', 'fntr', 'm:netorare', 'mntr'
, 'f:swinging', 'fswing', 'm:swinging', 'mswing'
// incest
, 'f:aunt', 'm:uncle'
, 'f:cousin', 'fcousin', 'm:cousin', 'mcousin'
, 'f:daughter', 'm:father'
, 'f:granddaughter', 'grand daughter'
, 'f:grandmother', 'grand mother', 'm:grandfather', 'grand father'
, 'f:incest', 'fincest', 'm:incest', 'mincest', 'incest'
, 'f:inseki', 'm:inseki', 'inseki'
, 'f:mother'
, 'f:niece'
, 'f:sister', 'm:brother'
// technical
, '3d'
, 'anaglyph'
, 'animated'
, 'anthology'
, 'artbook'
, 'figure'
, 'full censorship', 'mosaic censorship', 'uncensored', 'decensored'
, 'full color', 'coloured'
, 'game sprite'
, 'hardcore', 'non-nude'  // cosplay
, 'how to', 'tutorial'
, 'multi-work series'
, 'novel'
, 'paperchild'
, 'redraw', 'shopped'
, 'screenshots'
, 'stereoscopic'
, 'story arc'
, 'tankoubon'
, 'themeless'
, 'webtoon'
// expunge and semi-expunge
, 'already uploaded', 'compilation', 'replaced'
, 'forbidden content', 'realporn', 'watermarked'
, 'incomplete', 'missing cover', 'out of order', 'sample', 'scanmark'
// examples of tags that can be added: parodies, characters and artists/circles
, 'p:my little pony friendship is magic'
, 'c:applejack', 'c:fluttershy', 'c:pinkie pie'
, 'c:rainbow dash', 'c:rarity', 'c:twilight sparkle'
, 'c:princess celestia', 'c:pricess luna', 'c:spike'
, 'c:maud pie', 'c:shining armor', 'c:princess cadance'
, 'c:apple bloom', 'c:scootaloo', 'c:sweetie belle'
, 'c:queen chrysalis', 'c:derpy hooves', 'c:trixie'
, 'p:cardcaptor sakura'
, 'c:sakura kinomoto', 'c:syaoran li', 'c:tomoyo daidouji'
, 'c:touya kinomoto', 'c:yukito tsukishiro', 'c:eriol hiiragizawa'
, 'p:love hina'
, 'c:motoko aoyama', 'c:naru narusegawa', 'c:shinobu maehara'
, 'c:mitsune konno', 'c:mutsumi otohime', 'c:kaolla su'
, 'c:keitaro urashima'
, 'p:ah my goddess'
, 'c:belldandy', 'c:skuld', 'c:urd', 'c:keiichi morisato'
, 'c:peorth', 'c:chihiro fujimi'
, 'p:rurouni kenshin'
, 'c:kaoru kamiya', 'c:misao makimachi', 'c:sanjo tsubame'
, 'c:kenshin himura', 'c:sanosuke sagara', 'c:katamari honjou'
, 'p:chobits'
, 'c:chii', 'c:sumomo', 'c:yumi omura', 'c:takako shimizu'
, 'c:hideki motosuwa'
, 'p:neon genesis evangelion'
, 'c:rei ayanami', 'c:misato katsuragi', 'c:asuka langley soryu'
, 'c:ritsuko akagi', 'c:maya ibuki', 'c:gendo ikari'
, 'c:shinji ikari', 'c:kaworu nagisa', 'c:mari illustrious makinami'
, 'p:mahou shoujo lyrical nanoha'
, 'c:nanoha takamachi', 'c:fate testarossa', 'c:chrono harlaown'
, 'c:vivio takamachi', 'c:hayate yagami', 'c:yuuno scrya'
// artists/circles
, 'a:aichi shiho', 'a:bennys', 'a:chinzurena', 'a:dhibi', 'a:hanamaki kaeru'
, 'a:inaba cozy', 'a:inochi wazuka', 'a:mario', 'a:nanamatsu kenji'
, 'a:nemunemu', 'a:tsukuru', 'a:dynamite moca', 'a:katou chakichi'
, 'a:kashimada shiki', 'a:munomerikun', 'a:po-ju', 'a:mtno', 'a:kuromame'
, 'a:locon', 'a:neko maru rentarou', 'a:kitsune choukan', 'a:naokichi.'
, 'a:shimaji', 'a:kagechin', 'a:macop', 'a:uchoten', 'a:palco nagashima'
, 'a:amatake akewo', 'a:himenosu notari', 'a:collagen', 'a:amu', 'a:omecho'
, 'a:mogiki hayami', 'a:binto', 'a:shinozaki rei', 'a:katou yuuhi'
, 'a:musashino sekai', 'a:fuusen club', 'a:sexyturkey', 'a:chimosaku'
, 'a:tokimachi eisei', 'a:asaga aoi', 'a:asanagi', 'a:aian', 'a:takatsu'
, 'a:gujira', 'a:nagi ichi', 'a:piririnegi', 'a:clover', 'a:shiroo'
, 'a:kokuyuugan', 'a:jajala', 'a:kanimaru', 'a:makita aoi', 'a:katou jun'
, 'a:makuro', 'a:kanabayashi takai', 'a:rebis', 'a:ere 2 earo', 'a:akai mato'
, 'a:sakai ringo', 'a:kanmirenjaku sanpei', 'a:nekoen', 'a:ogami wolf'
, 'a:izumi yayoi', 'a:urakuso', 'a:mame', 'a:takase yuu', 'a:tonikaku'
, 'a:fk696', 'a:chiku', 'a:musashi daichi', 'a:the amanoja9', 'a:nostradamuo'
, 'a:udk', 'a:saikawa yusa', 'a:scotch', 'a:kurenai yuuji', 'a:obata yayoi'
, 'a:suemitsu dicca', 'a:dori rumoi', 'a:ziz', 'a:ryokutya', 'a:coin rand'
, 'a:kurosaki bunta', 'a:hakuyagen', 'a:aogiri penta', 'a:kuroshi ringo'
, 'a:kakugari kyoudai', 'a:hiiragi masaki', 'a:kotoko', 'a:hayashi'
, 'a:mizuki key', 'a:yanagawa rio', 'a:aya', 'a:marui maru', 'a:sugar milk'
, 'g:cannabis', 'g:pish lover', 'g:seki sabato', 'g:b kaiman'
, 'g:soundvillage', 'g:granada sky', 'g:null mayu', 'g:temparing'
, 'g:magenta rose', 'g:fatalpulse', 'g:shotaian', 'g:berugamoto'
, 'g:rkaffy', 'g:yuunagi no senryokugai butai', 'g:zenra qq'
, 'g:yadokugaeru', 'g:oshiruko kan', 'g:hi-per pinch', 'g:tamago no kara'
, 'g:senya sabou', 'g:ash wing', 'g:datsuryoku kenkyuukai', 'g:dryr'
, 'g:daiichi yutakasou', 'g:game dome', 'g:mercator zuhou', 'g:abgrund'
, 'g:futararun', 'g:mizuiro zenmai', 'g:mizu', 'g:chijoku an'
, 'g:pantwo', 'g:arsenothelus', 'g:sweettaboo', 'g:free style'
, 'g:mitegura', 'g:high-spirit', 'g:kudamono monogatari', 'g:niku ringo'
, 'g:milk boy', 'g:hayashi puramoten', 'g:yayoi fantasy zone'
// the list works best for long and distinct names but badly for very similar
// names, e.g. final fantasy or dragon quest series would be a pain to
// autocomplete
    ];
})();

// useful to tell us if something blew up
console.log('eh-fixed-tagfield is active');

