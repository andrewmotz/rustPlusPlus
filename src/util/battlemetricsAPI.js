/*
    Copyright (C) 2022 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustPlusPlus

*/

const RandomUsernames = require('./RandomUsernames.json');
const Scrape = require('./scrape.js');

module.exports = {
    getBattlemetricsServerId: async function (client, serverName) {
        let searchServerName = encodeURI(serverName);
        let serverNameEscaped = module.exports.escapeRegExp(serverName);
        searchServerName = serverNameEscaped.replace('\#', '\*');
        const search = `https://api.battlemetrics.com/servers?filter[search]=${searchServerName}&filter[game]=rust&fields[server]=name`;
        const response = await Scrape.scrape(search);

        if (response.status !== 200) {
            client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'failedToScrape', {
                scrape: search
            }), 'error')
            return null;
        }
       
        let data = response.data.data
        try {
            if (data.length > 0 && data.data[0].attributes.name === serverName) {
                return data.data[0].id;
            }
        }
        catch (e) { }

        return null;
    },

    getBattlemetricsServerInfo: async function (client, serverId) {
        const search = `https://api.battlemetrics.com/servers/${serverId}?include=session`;
        const response = await Scrape.scrape(search);

        if (response.status !== 200) {
            client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'failedToScrape', {
                scrape: search
            }), 'error')
            return null;
        }

        return response;
    },

    getBattlemetricsServerOnlinePlayers: async function (client, serverId, serverInfo = null) {
        if (serverInfo === null) {
            serverInfo = await module.exports.getBattlemetricsServerInfo(client, serverId);

            if (serverInfo === null) {
                client.log(client.intlGet(null, 'errorCap'), client.intlGet(null, 'failedToGetTeamTrackerInfo', {
                    id: serverId
                }), 'error')
                return null;
            }
        }

        let onlinePlayers = [];
        for (let inluded of serverInfo.included) {
            try {
                if (inluded.type === "session") {
                    // Now UTC - session start UTC
                    let timePlayed = new Date(Date.now() - new Date(inluded.attributes.start));
                    onlinePlayers.push({ 
                        id: inluded.relationships.player.data.id, 
                        name: inluded.attributes.name, 
                        time: `${timePlayed.getHours()}:${timePlayed.getSeconds()}` 
                    });
                }
            }
            catch (e) { }
        }

        return onlinePlayers;
    },

    isBattlemetricsServerHidden: function (players) {
        for (let player of players) {
            if (!RandomUsernames.RandomUsernames.includes(player.name)) {
                return false;
            }
        }

        if (players.length <= 3) {
            /* In case there are too few people on the server to decide */
            return false;
        }
        return true;
    },

    escapeRegExp: function (text) {
        return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    },
}
