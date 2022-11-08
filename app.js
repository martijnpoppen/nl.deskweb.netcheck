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

        this.currentStatus = 'Online';

        this.verifyConnection();

        // this.homey.setInterval(() => {
        //     this.verifyConnection(this);
        // }, 15000);
    }

    async verifyConnection() {
        // 1.1.1.1 = Cloudflare
        this.log('verifyConnection - Performing web request to Cloudflare');

        const isFailure = await fetch('https://cloudflare.com', {
            method: 'FET',
            cache: 'no-cache',
            headers: { 'Content-Type': 'application/json' },
            referrerPolicy: 'no-referrer'
        })
            .then(() => false)
            .catch(() => true);

        this.flowTrigger(isFailure);

        const that = this;
        setTimeout(() => {
            that.verifyConnection();
        }, 15000);
    }

    flowTrigger(isFailure = false) {
        try {
            const triggerType = isFailure ? 'connection_lost' : 'connection_restored';
            const triggerStatus = isFailure ? 'Offline' : 'Online';

            this.log(`verifyConnection - ${triggerStatus} ...`);

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
