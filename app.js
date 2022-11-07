const Homey = require('homey');
const dns = require('dns');

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
        this.verifyConnection(this);

        this.homey.setInterval(() => {
            this.verifyConnection(this);
        }, 15000);
    }

    async verifyConnection(ctx) {
        // 1.1.1.1 = Cloudflare
        ctx.log('verifyConnection - Performing web request to Cloudflare');

        dns.resolve('1.1.1.1', function (err) {
            if (err) {
                ctx.log('verifyConnection - Failure ...')
                ctx.flowTrigger(true);
            } else {
                ctx.log('verifyConnection - Succes ...')
                ctx.flowTrigger(false);
            }
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
