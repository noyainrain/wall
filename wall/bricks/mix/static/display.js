/*
 * Wall
 */

wall = wall || {};
wall.bricks = wall.bricks || {};
wall.bricks.mix = wall.bricks.mix || {};
wall.bricks.mix.display = {};
(function(ns) {

/* ==== DisplayBrick ==== */

ns.DisplayBrick = function(ui, html) {
    wall.Brick.call(this, ui, html);
    ui.msgHandlers["mix_post_track_added"] = ui.eventMessage.bind(ui);
    ui.msgHandlers["mix_post_track_removed"] = ui.eventMessage.bind(ui);
    ui.msgHandlers["mix_post_track_updated"] = ui.eventMessage.bind(ui);
    ui.addPostElementType(ns.MixPostElement);
};

ns.DisplayBrick.prototype = Object.create(wall.Brick.prototype, {
    id: {value: "mix"}
});

/* ==== MixPostElement ==== */

ns.MixPostElement = function(post) {
    wall.display.PostElement.call(this, post, ui);
    this._tracks = {};
    
    this.index = 0;
    // create web audio api context
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // create gain node
    this.gainNode = this.audioCtx.createGain();

    // connect oscillator to gain node to speakers
    this.gainNode.connect(this.audioCtx.destination);

    var initialVol = 0.05;

    // set initial gain
    this.gainNode.gain.value = initialVol;

    this.bpm = 70;
    this.noteLength = (60/this.bpm)/4;
    
    var span = document.createElement("span");
    span.classList.add("fa");
    span.classList.add("fa-music");
    this.content.appendChild(span);

    ui.addEventListener("mix_post_track_added", this._trackUpdated.bind(this));
    ui.addEventListener("mix_post_track_removed",
        this._trackRemoved.bind(this));
    ui.addEventListener("mix_post_track_updated",
        this._trackUpdated.bind(this));
};

ns.MixPostElement.prototype = Object.create(wall.display.PostElement.prototype, {
    postType: {value: "MixPost"}, 
    attachedCallback: {value: function() {
        window.setInterval(this._foo.bind(this), this.noteLength*1000);
    }},
    
    _foo: {value: function() {
        this.playAllNotes(this.index, this._tracks, this.noteLength);
        // evil shit. fix this, really!
       if (this.index == 16 - 1) 
       {
	       this.index = 0;
       }
       else 
       {
	    this.index++;
       }
    }},

playNote: {value: function(noteKeyValue, noteLength) {
   if (noteKeyValue !== null) 
   {

    noteKeyValue = 11 - noteKeyValue; // XXX
	// create oscillator	
	var oscillator = this.audioCtx.createOscillator();
	// connect to output (speakers)
	oscillator.connect(this.gainNode);
	// set oscillator parameters
	oscillator.type = 'square';
	oscillator.detune.value = 100; // value in cents	
	oscillator.frequency.value = calculateNotePitch(noteKeyValue);
	oscillator.start();
	window.setTimeout(stopOscillator, (noteLength*1000) - 50, oscillator);
   }
   // oscillator.stop() destroys oscillator object
   // if (oscillator && noteKeyValue == null) {
   //	oscillator.stop();
   //	}
   
   
}},

playAllNotes: {value: function(index, tracks, noteLength) {
   for (var key in tracks) {
      this.playNote(tracks[key][index], noteLength);
   }
}},
    
    _trackUpdated: {value: function(event) {
        this._tracks[event.args.track.user_id] = event.args.track.values;
        console.log(this._tracks);
    }},

    _trackRemoved: {value: function(event) {
        delete this._tracks[event.args.track.user_id];
        console.log(this._tracks);
    }}
});

// calculate note frequency in hertz given a key
function calculateNotePitch(noteNumber) {
   return Math.pow(Math.pow(2, (1/12)), noteNumber + 3) * 440;
}

function stopOscillator(oscillator) {
   oscillator.stop();
}


}(wall.bricks.mix.display));
