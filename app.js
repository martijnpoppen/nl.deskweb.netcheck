
const http = require('http');
const speech = Homey.manager('speech-output');
const ledring = Homey.manager('ledring');
const cron = Homey.manager('cron');
const settings = Homey.manager('settings');

function init() {
	myLog(__('starting'));

    settings.set('curstatus', 'F');
    
    cron.registerTask('deskweb-netcheck', '* * * * *', null, function(err, success) {
        if (err) {
            // usually this means the task already exists. not a problem
            myLog(err);
        }
    });
    
    cron.on('deskweb-netcheck', function(data) {
        myLog(__('verifying'));
        verifyConnection();
    });

    // crontab verwijderen
    Homey.on('unload', function(){
        cron.unregisterTask('deskweb-netcheck', function(err, success) {
            myLog(__('unloading'));
        });
    });
}

function verifyConnection() {
    // 74.125.133.94 = google.nl
    var chunk, data;
    
    var req = http.request({
            host:   '74.125.133.94',
            path:   '/',
            method: 'GET'
        },
        (response) => {
            response.on('data', chunk => data += chunk);
            response.on('end', () => notifyUser(false));
        });

    req.on('error', e => notifyUser(true));
    req.end();
}

function myLog(PsMessage) {
    Homey.log(PsMessage);
}

function notifyUser(PbProblem) {
    var LsColor = (! PbProblem ? '#00f000' : '#a00000');
    var LnLength = (PbProblem ? 2500 : 125);
    var LsMessage;

    var LbNewstatus = (PbProblem ? 'T' : 'F');
    
    try {
        if (PbProblem || settings.get('hbeat') == '1') {
            myLog(__('animating', { 'status': LbNewstatus }));
            
            ledring.animate('pulse', { color: LsColor, rpm: 4 }, 'INFORMATIVE', LnLength, function(err, success) {
                if (err) {
                    myLog(err);
                }
            });
        }
    }
    catch (err) {
        myLog(__('exception', { 'err': err }));
    }

    try {
        if (settings.get('curstatus') != LbNewstatus) {
            if (PbProblem) {
                LsMessage = __('problem');
            }
            else {
                LsMessage = __('solved');
            }
        
            speech.say(LsMessage, function(err, success) {
                if (err) {
                    myLog(err);
                }
            });
            
            settings.set('curstatus', LbNewstatus);
        }
    }
    catch (err) {
        myLog(__('exception', { 'err': err }));
    }
}

module.exports.init = init;