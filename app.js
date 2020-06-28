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
		// 1.1.1.1 = Cloudflare
		var chunk, data;

        this.logMessage('Performing web request ...');

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
        var LsTrigger = (PbProblem ? 'connection_lost' : 'connection_restored');
        var LsMessage;

        var LbNewstatus = (PbProblem ? 'T' : 'F');

        try {
            if (PbProblem) {
                this.logMessage('animating: status = ' +  LbNewstatus );

                var LaFrames = [];
                var LaFrame = [];

                for (var i = 0; i < 24; i++) {
                    if (PbProblem) {
                        LaFrame.push({ r: 200, g: 0, b: 0 });
                    }
                    else {
                        LaFrame.push({ r: 0, g: 160, b: 0 });
                    }
                }
                LaFrames.push(LaFrame);

                const myAnimation = new Homey.LedringAnimation({
                    options: {
                        fps: 1,                             // real frames per second
                        tfps: 60,                           // target frames per second. this means that every frame will be interpolated 60 times
                        rpm: 2,                             // rotations per minute
                    },
                    frames: LaFrames,
                    priority: 'INFORMATIVE',                // or FEEDBACK, or CRITICAL
                    duration: (PbProblem ? 2500 : 125)      // duration in ms, or keep empty for infinite
                });

                myAnimation
                    .on('start', () => {

                    })
                    .on('stop', () => {

                    })
                    .register()
                    .then(() => {
                        this.log('Animation registered!');

                        myAnimation.start();
                    })
                    .catch(this.error);
            }
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