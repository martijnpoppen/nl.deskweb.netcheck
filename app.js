const Homey = require('homey');
const axios = require('axios');

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

        this.homey.setInterval(() => {
            this.verifyConnection();
        }, 15000);
    }

    async verifyConnection() {
        // 1.1.1.1 = Cloudflare
        this.log('verifyConnection - Performing web request to Cloudflare');

        await axios
            .get('https://1.1.1.1')
            .then((response) => {
                this.log('verifyConnection - Succes ...');
                return this.flowTrigger(false);
            })
            .catch((error) => {
                this.log('verifyConnection - Failed ...');
                return this.flowTrigger(true);
            });
    }

    flowTrigger(isFailure = false) {
        try {
            const triggerType = isFailure ? 'connection_lost' : 'connection_restored';
            const triggerStatus = isFailure ? 'Offline' : 'Online';

            if (this.currentStatus != triggerStatus) {
                this.currentStatus = triggerStatus;

                this.log('flowTrigger - type: ' + triggerType);

                this.homey.app.trigger_network = this.homey.flow.getTriggerCard(triggerType);
                this.homey.app.trigger_network
                    .trigger()
                    .catch(this.error)
                    .then(this.log(`flowTrigger - ${triggerType} triggered succesfully`));

                let rainStartTrigger = new Homey.FlowCardTrigger(triggerType);
                rainStartTrigger.register().trigger().catch(this.error).then(this.log('flowTrigger - flow triggered succesfully'));
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
