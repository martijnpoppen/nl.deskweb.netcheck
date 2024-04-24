const Homey = require('homey');
const fetch = require('node-fetch');

class App extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    async onInit() {
        this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        await this.flowConditions();
        await this.setSettings();

        this.currentStatus = 'Online';
        this.isFailureRate = 0;

        this.verifyConnection();
    }

    async setSettings() {
        this.appSettings = this.homey.settings.get('settings');

        if(!this.appSettings) {
            this.log("setSettings - Appsettings not found - setings default");
            this.homey.settings.set('settings', {
                host: 'https://cloudflare.com',
                interval: 15,
                failure_rate: 3
            });

            this.appSettings = this.homey.settings.get('settings');
        }
        
        if('host' in this.appSettings === false) {
            await this.homey.settings.set('settings', {
                ...this.appSettings,
                host: 'https://cloudflare.com'
            });
        }

        if('interval' in this.appSettings === false) {
            await this.homey.settings.set('settings', {
                ...this.appSettings,
                interval: 15
            });
        }

        if('interval' in this.appSettings && this.appSettings.interval < 10) {
            await this.homey.settings.set('settings', {
                ...this.appSettings,
                interval: 10
            });
        }

        if('failure_rate' in this.appSettings === false) {
            await this.homey.settings.set('settings', {
                ...this.appSettings,
                failure_rate: 3
            });
        }

        if('failure_rate' in this.appSettings && this.appSettings.failure_rate < 3) {
            await this.homey.settings.set('settings', {
                ...this.appSettings,
                failure_rate: 3
            });
        }
    }

    async verifyConnection() {
        this.appSettings = this.homey.settings.get('settings');
        this.log("verifyConnection - appSettings:",  this.appSettings);
        this.log('verifyConnection - Performing web request to ', this.appSettings.host);

        const isFailure = await fetch(this.appSettings.host, {
            method: 'FET',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            referrerPolicy: 'no-referrer'
        })
            .then(() => false)
            .catch(() => true);

        
        if(isFailure) {
            this.isFailureRate += 1;
            this.log('verifyConnection Failed - FailureRate: ', this.isFailureRate);
        } else {
            this.isFailureRate = 0;
            this.log('verifyConnection Succes - FailureRate: ', this.isFailureRate);
            this.flowTrigger(false);
        }

        if(this.isFailureRate >= this.appSettings.failure_rate) {
            this.flowTrigger(true);
        }

        const that = this;
        setTimeout(() => {
            that.verifyConnection();
        }, this.appSettings.interval * 1000);
    }

    flowTrigger(isFailure = false) {
        try {
            const triggerType = isFailure ? 'connection_lost' : 'connection_restored';
            const triggerStatus = isFailure ? 'Offline' : 'Online';

            this.log(`flowTrigger - ${triggerStatus} ...`);

            if (this.currentStatus != triggerStatus) {
                this.currentStatus = triggerStatus;

                this.log('flowTrigger - type: ' + triggerType);

                this.homey.app.trigger_network = this.homey.flow.getTriggerCard(triggerType);
                this.homey.app.trigger_network
                    .trigger()
                    .catch(this.error)
                    .then(this.log(`flowTrigger - ${triggerType} triggered succesfully`));
            }
        } catch (err) {
            this.log('flowTrigger - error: ', err);
        }
    }

    async flowConditions() {
        const connection_online_offline = this.homey.flow.getConditionCard('connection_online_offline');
        connection_online_offline.registerRunListener(async () => this.currentStatus === 'Online');
    }
}

module.exports = App;
