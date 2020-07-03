/**
 * Ideas to implement:
 * Level up call "!levelup" that sort BAB, Will, Caster Level etc...
 * 
 */

/**
 * There are several "on".events,
 * More info on each found here:
 * https://wiki.roll20.net/API:Events
 */
on("ready", function(){
    log("Broken Bonds API v0.0.1");
});

function recalc(params) {
    document.getElementsByName("act_le_big_stuff");
}

on("chat:message", function(msg){ 
    if(msg.type != "api") return;

    var sender = '"' + msg.who + '"';
    if(playerIsGM(msg.playerid)){
        sender = sender.replace(" (GM)", "");
    }
    var args = [];
    var content = msg.content
    do {
        index = content.indexOf("´");
        index2 = content.indexOf("´", index+1)
        substr = content.substr(index,index2)
        args.push(substr)
        sender.replace(substr, "")
    } while (msg.indexOf("´"));

    args = msg.content.split(" ");
    //!a hp `if(@{hp} + @{charisma_mod} > @{hp|max}) else{@{hp} + @{charisma_mod}}`
    switch (args[0]) {
        case "!r":
            recalc();
        case "!h":
            w_player(sender,"This is the help screen for the Broken Bonds API<br>"
            + "The Commands are:<br>"
            + "!h (for this screen)<br>"
            //"!spell <element> <shape> <distance> <damage> (EX: !spell fire cone 60 [[1d6 + @{wis_mod}]])"
            + "!spell &lt;element&gt; &lt;shape&gt; &lt;distance&gt; &lt;damage&gt; (EX: !spell fire cone 60 &#91;&#91;1d6 + &#64;{wis_mod}&#93;&#93;)<br>"
            + "!a  &lt;name of attribute&gt; &lt;amount&gt; (set the named attribute to that amount, EX: !a hp 10 )");
            break;
        case "!spell":
            if(args.length < 2){
                w_player(sender,"Invalid amount of arguments");
                break;
            }
            if(args[1] == "fire") {
                var cone_60ft = findObjs({
                    _type: "graphic",
                    name: "fire"
                })[0];
                var x = 280; 
                var y = 280;
                var selected = msg.selected || "";
                if(selected.length != 0 && selected[0]._type == "graphic") {
                    var obj = getObj(selected[0]._type, selected[0]._id);
                    x = obj.get("left");
                    y = obj.get("top") + 70;
                }
                var fire_ball = createObj("graphic",
                {
                    name:  "fireball",
                    subtype: "token",
                    imgsrc: cone_60ft.get("imgsrc"),
                    width: cone_60ft.get("width"),
                    height: cone_60ft.get("height"),
                    left: x,
                    top: y,
                    showname: true,
                    showplayers_name: true,
                    layer: "objects",
                    controlledby: cone_60ft.get("controlledby"),
                    pageid:           Campaign().get("playerpageid")
                });
            }
            w_player(sender, "You Have casted a '" + args[1] + " ball'");
            break;
        case "!a":
            if(args.length != 3){
                w_player(sender, "Invalid amount of arguments, the argument are: " + args 
                + "!a  &lt;name of attribute&gt; &lt;amount&gt; (set the named attribute to that amount, EX: !a hp 10 )");
                break;
            }
            
            var  amount = args[2];

            if(msg.inlinerolls != undefined){
                msg.inlinerolls.forEach((roll, i) => {
                    amount = amount.replace("$[[" + i + "]]", roll.results.total);
                });
            }
            
            try{
                amount = eval(amount);
            }
            catch(e){
                log(e);
                w_player(sender, "The attr change: '" + args[2] + "' is not a number or can not be evaluated as a number");
                break;
            }

            var name = args[1];

            if(toType(name) != "string"){
                w_player(sender, "The attribute must be a string, is of type: " + toType(name));
                break;
            }
            var chr = get_character(msg);
            if(!chr){
                //the get_character sends a error message, so we just break
                break;
            }
            var attr = get_attr(chr.id, name);
            if(attr == undefined){
                w_player(sender, "Could not find the attribute: " + name);
                break;
            }
            /**Whisper the changes their player did to the gm */
            w_gm(msg.who + " changed their " + name + " from:" + getAttrByName(chr.id, name) + " to: " + amount);
            attr.set("current", amount);
            w_player(sender, "Your " + name + " has been changed to " + getAttrByName(chr.id, name));
        break;
        default:
            w_player(sender, "Invalid command! try !h for help");
        break;
    }
    return;
});

function get_attr(chr_id, atr_name){
          return findObjs({type: "attribute", characterid: chr_id, name: atr_name})[0];
}

var toType = function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase()
}
function d_log(msg){
    log(msg);
    sendChat("Broken Bonds API Debug", msg);
}
function w_gm(w_msg){
    sendChat("Broken Bonds API", "/w gm " + w_msg)
}
function w_player(player_short, w_msg) {
    sendChat("Broken Bonds API", "/w " + player_short + " " +  w_msg);
}

/**
 * Using the chat event we figure out what he has selected and then what character it belongs to
 * to return the character object
 * @param {ChatEvent} msg 
 * @returns {CharacterObject}
 */
function get_character(msg){
     //Make sure user has a token selected
     var sender = msg.who.split(" ")[0]; 
     if(!msg.selected){
        w_player(sender, "Select a token/character first");
        return null;
    }

    //Get token
    var chr = getObj(msg.selected[0]._type, msg.selected[0]._id);
    if(!chr){
        w_player(sender, "Invalid token/character selection");
        return null;
    }

    //If token is of type "graphic" get the character owner of token
    if(msg.selected[0]._type == "graphic"){
        if(chr.get("represents").length == 0){
            w_player(sender, "The token represents nothing");
            return null;
        }
        chr = getObj("character", chr.get("represents"));
        if(!chr){
            w_player(sender, "Could not find what the token represents");
            return null;
        }
    }

    //Make sure it's now of correct type
    if(chr.get("_type")!= "character"){
        w_player(sender, "Invalid type, must be character is of type: " + chr.get("_type"));
        return null;
    }

    //Notify the gm if someone tried to change some attributes on a character they do not own
    var chr_owner_ids = chr.get("controlledby").split(',');
    if(!playerIsGM(msg.playerid) && !chr_owner_ids.includes(msg.playerid) && 
    !chr_owner_ids.includes("all")){
        w_player(sender, "You do not control this token");
        var chr_owner_name = [];
        for (let index = 0; index < chr_owner_ids.length; index++) {
            const e = chr_owner_ids[index];
            if(e == "all"){
                chr_owner_name.push("All");
                continue;
            }
            chr_owner_name.push(getObj("player", e).get("_displayname"));                     
        }
        w_gm(msg.who + "tried to modify a token he/she did not control, owner(s): " + chr_owner_name);
    }

    return chr;
}