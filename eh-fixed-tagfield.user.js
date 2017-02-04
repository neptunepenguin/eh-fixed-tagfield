// ==UserScript==
// @name        eh-fixed-tagfield
// @namespace   e-hentai
// @description adds a tag field fixed to the browser window
// @include     http://e-hentai.org/g/*
// @include     https://e-hentai.org/g/*
// @include     https://exhentai.org/g/*
// @version     0.2
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
, 'f:multiple breasts', 'multiboob'
, 'f:multiple nipples', 'm:multiple nipples'
, 'f:multiple penises', 'multidick', 'm:multiple penises'
, 'f:multiple vaginas'  // no male version yet
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
, 'f:breast expansion'  // no male version yet
, 'f:breast reduction'  // no male version yet
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
, 'f:vampire', 'm:vampie'
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
, 'f:weight gain', 'm:weight gain'
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
, 'f:corruption', 'fcorr', 'm:corruption', 'mcorr'
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
, 'f:eye penetration', 'feyefuck', 'm:eye penetration'  // missing meyefuck
, 'f:first person perspective', 'm:first person perspective'
, 'f:heterochromia', 'm:heterochromia'
, 'f:unusual pupils', 'm:unusual pupils'
// nose
, 'f:nose fuck', 'm:nose fuck'
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
, 'f:breast feeding', 'fbreastfeed', 'm:breast feeding', 'mbreastfeed'  // wiki only male
, 'f:huge breasts', 'fhuge breasts'
, 'f:lactation', 'm:lactation'
, 'f:milking', 'fmilking'  // male links to handjob
, 'f:multiple paizuri'  // no male version yet
, 'f:oppai loli'  // female only
, 'f:paizuri', 'fpai', 'm:paizuri', 'mpai'  // wiki only female
, 'f:small breasts', 'small breats'
// nipples
, 'f:big nipples', 'fbignipple', 'm:big nipples', 'mbignipple'
, 'f:dark nipples', 'm:dark nipples'
, 'f:dicknipples', 'm:dicknipples'
, 'f:inverted nipples', 'm:inverted nipples'
, 'f:multiple nipples', 'm:mulitple nipples'
, 'f:nipple birth', 'fniiplebirth', 'm:nipple birth', 'mnipplebirth'
, 'f:nipple fuck'  // no male version yet
// torso
, 'f:navel fuck', 'm:navel fuck'
, 'f:stocmach deformation', 'm:stocmach deformation'
// crotch
, 'f:condom', 'fcondom', 'm:condom', 'mcondom'
, 'f:crotch tattoo'  // no male version yet
, 'f:hairy', 'm:hairy'
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
, 'f:phimosis', 'fphimosis', 'm:phimosis'  // missing mphimosis
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
, 'f:butler', 'fbutler', 'm:butler', 'mbutler'  // wiki only female
, 'f:cashier', 'facsh', 'm:cashier', 'mcash'
, 'f:chastity belt', 'fcb', 'm:chastity belt', 'mcb'
, 'f:cheerleader', 'fcheer', 'm:cheerleader', 'mcheer'
, 'f:chinese dress', 'm:chinese dress'
, 'f:christmas', 'fchrist', 'm:christmas', 'mchrist'
, 'f:collar', 'm:collar'
, 'f:corset', 'fcorset', 'm:corset', 'mcorset'
, 'f:cosplaying', 'fcosplay', 'm:cosplaying'  // missing mcosplay
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
, 'f:pantyjob', 'm:pantyjob'
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
, 'f:tube', 'ftube', 'm:tube'  // missing mtube
, 'f:vacbed', 'm:vacbed'
, 'f:whip', 'fwhip', 'm:whip', 'mwhip'
, 'f:wooden horse', 'fwooden', 'm:wooden horse'  // missing mwooden
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
, 'f:humman cattle'  // no male version yet
, 'f:human pet', 'pergirl', 'm:human pet', 'petgirl'
, 'f:orgasm denial', 'm:orgasm denial'
, 'f:rape', 'frape', 'm:rape', 'mrape'
, 'f:shibari', 'fshibari', 'm:shibari', 'mshibari'
, 'f:slave', 'fslave', 'm:slave', 'mslave'
, 'f:stuck in wall', 'fstuck', 'm:stuck in wall', 'mstuck'
, 'f:tickling', 'ftickle', 'm:tickling'  // missing mtickle
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
, 'f:blind', 'fblind', 'm:blind'  // missing mblind
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
, 'f:widow', 'm:widower'  // m:widower does not exist!
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
// TODO
// examles of tags that can be added: parodies, characters and artists/circles
, 'p:my little pony friendship is magic'
, 'p:cardcaptor sakura'
];

})();

// useful to tell us if something blew up
console.log('eh-fixed-tagfield is active');

