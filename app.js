'use strict';

const Homey = require('homey');
const http = require('http');

class MyApp extends Homey.App {
	
	onInit() {
		this.currentStatus = 'F';
		this.logMessage('nl.deskweb.network-check is being initialized');

        // Initiele test om de boel aan te zwengelen
        this.verifyConnection();
	}

    logMessage(sLog) {
        // Only for debug purposes
        if (false) {
            this.log(sLog);
        }
    }

    verifyConnection() {
		// 74.125.133.94 = google.nl
		var chunk, data;
		
		var req = http.request({
				host:   '1.1.1.1',
				path:   '/',
				method: 'GET'
			},
			(response) => {
				response.on('data', chunk => data += chunk);
				response.on('end', () => this.notifyUser(false));
			});

		req.on('error', e => this.notifyUser(true));
		req.end();

        var myApp = this;
        setTimeout(function () { 
            myApp.verifyConnection(); 
        }, 15000);
	}
		
    notifyUser(PbProblem) {
        var LaColor = (! PbProblem ?{ r: 0, g: 160, b: 0 } : { r: 160, g: 0, b: 0 } );
        var LnLength = (PbProblem ? 2500 : 125);
        var LsTrigger = (PbProblem ? 'connection_lost' : 'connection_restored');
        var LsMessage;
    
        var LbNewstatus = (PbProblem ? 'T' : 'F');
        
        var LaFrames = [];
        var LaFrame = [];

        for (var i = 0; i < 24; i++) {
            LaFrame.push(LaColor);
        }
        LaFrames.push(LaFrame);

        try {
			this.logMessage('animating: status = ' +  LbNewstatus );

            const myAnimation = new Homey.LedringAnimation({
                options: {
                  fps: 1,       // real frames per second
                  tfps: 60,     // target frames per second. this means that every frame will be interpolated 60 times
                  rpm: 0,       // rotations per minute
                },
                frames: LaFrames,
                priority: 'INFORMATIVE', // or FEEDBACK, or CRITICAL
                duration: LnLength, // duration in ms, or keep empty for infinite
              });
              
              // register the animation with Homey
              myAnimation
                .on('start', () => {
                  // The animation has started playing
                })
                .on('stop', () => {
                    // The animation has stopped playing
                })
                .register()
                  .then( () => {
                    this.log('Animation registered!');
              
                    myAnimation.start();
                  })
                  .catch( this.error );            
        }
        catch (err) {
            this.logMessage('exception: err = ' + err);
        }
    
        try {
            if (this.currentStatus != LbNewstatus) {
                this.currentStatus = LbNewstatus;
    
                // flow triggeren als we een melding binnen hebben gekregen
                this.logMessage('triggering: type = ' + LsTrigger);

				let rainStartTrigger = new Homey.FlowCardTrigger(LsTrigger);
				rainStartTrigger
					.register()
					.trigger()
						.catch( this.error )
						.then( this.log('flow triggered succesfully') )
            }
        }
        catch (err) {
            this.logMessage('exception: err = ' + err);
        }
    }	
}

module.exports = MyApp;