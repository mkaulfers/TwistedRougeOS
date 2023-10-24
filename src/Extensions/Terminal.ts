import { TRACE, INFO, DEBUG } from 'Constants/LogConstants';
import { Utils } from 'utils/Index';
declare global {
    interface StructureTerminal {
        /**
         * Will sell the requested resource given the set limitations.
         * @param type The Resource Constant of the resource you wish to sell.
         * @param opts.quantity Quantity of the resource you wish to sell. Defaults to All.
         * @param opts.stddev How many standard deviations from the median price to accept as a viable order. Default is 2.
         * @param opts.range Room range limit. Defaults to 35.
         * @param opts.eMin Minimum quantity of energy in the terminal to allow the command to run. Defaults at 20000.
         */
        sell(type: ResourceConstant, opts?: { quantity?: number, stddev?: number, range?: number, eMin?: number}): ScreepsReturnCode
        /**
         * Will buy the requested resource given the set limitations.
         * @param type The Resource Constant of the resource you wish to sell.
         * @param opts.quantity Quantity of the resource you wish to sell. Defaults to All.
         * @param opts.stddev How many standard deviations from the median price to accept as a viable order. Default is 2.
         * @param opts.range Room range limit. Defaults to 35.
         * @param opts.eMin Minimum quantity of energy in the terminal to allow the command to run. Defaults at 20000.
         *
         */
        buy(type: ResourceConstant, opts?: { quantity?: number, stddev?: number, range?: number, eMin?: number}): ScreepsReturnCode
        /** Used to fetch the price of a resource. Averages over the days considered.
         * @param resource The resource constant you wish to know the price of
         * @param daysAgo Optional of starting day to pull data from. Defaults to today.
         * @param dayRange Optional of how many days to consider. Defaults to three.
         */
        fetchPrice(resource: ResourceConstant, daysAgo?: number, dayRange?: number): MarketPrice
    }
}

export default class Terminal_Extended extends StructureTerminal {
    sell(type: ResourceConstant, opts?: { quantity?: number, stddev?: number, range?: number, eMin?: number}): ScreepsReturnCode {
        Utils.Logger.log("Terminal -> sell()", TRACE);

        // Handle opts
        let options = {
            quantity: opts && opts.quantity ? opts.quantity : this.store[type],
            stddev: opts && opts.stddev ? opts.stddev : 2,
            range: opts && opts.range ? opts.range : 35,
            eMin: opts && opts.eMin ? opts.eMin : 20000,
        }

        // Handle failure modes
        if (options.range < 1) return ERR_INVALID_ARGS;
        if (this.store[type] === 0) return ERR_NOT_ENOUGH_RESOURCES;
        if (this.cooldown > 0) return ERR_TIRED;
        if (this.store.energy < options.eMin) return ERR_NOT_ENOUGH_ENERGY;

        // Fetch price range
        const priceData = this.fetchPrice(type)
        if (priceData.price === 0) return ERR_NOT_FOUND
        let minPrice = priceData.price - (priceData.std * options.stddev)
        // TODO: Modify to be per resource
        if (minPrice == undefined) minPrice = 1;

        // Find order
        const orders = Game.market.getAllOrders({ type: ORDER_BUY, resourceType: type });
        if (orders.length < 1) return ERR_NOT_FOUND;

        let bestOrder;
        for (const order of orders) {
            if (!order.roomName) continue;
            let dist = Game.map.getRoomLinearDistance(this.room.name, order.roomName, true);
            if (!dist || dist > options.range) continue;
            if (order.price > (bestOrder ? bestOrder.price : minPrice)) bestOrder = order;
        }
        if (!bestOrder) return ERR_NOT_FOUND;

        // Limit quantity based on send cost
        let sendCost = Game.market.calcTransactionCost(options.quantity, this.room.name, bestOrder.roomName ? bestOrder.roomName : this.room.name);
        while (sendCost > this.store[RESOURCE_ENERGY]) {
            options.quantity = Math.floor(options.quantity * (options.eMin / sendCost));
            sendCost = Game.market.calcTransactionCost(options.quantity, this.room.name, bestOrder.roomName ? bestOrder.roomName : this.room.name);
        }
        if (type === RESOURCE_ENERGY) options.quantity = options.quantity - sendCost

        // Sell the resource
        Utils.Logger.log(`Sell ${type} bestOrder: ${bestOrder.id}, ${bestOrder.price}, ${bestOrder.amount}, dist: ${bestOrder.roomName ? Game.map.getRoomLinearDistance(this.room.name, bestOrder.roomName, true) : undefined}.`, DEBUG)
        if (Memory.autoMarket === true) return Game.market.deal(bestOrder.id, Math.min(bestOrder.amount, options.quantity), this.room.name);
        return OK;
    }

    buy(type: ResourceConstant, opts?: { quantity?: number, stddev?: number, range?: number, eMin?: number}): ScreepsReturnCode {
        Utils.Logger.log("Terminal -> buy()", TRACE);

        // Handle opts
        let options = {
            quantity: opts && opts.quantity && opts.quantity <= this.store.getFreeCapacity(type) ? opts.quantity : this.store.getFreeCapacity(type),
            stddev: opts && opts.stddev ? opts.stddev : 2,
            range: opts && opts.range ? opts.range : 35,
            eMin: opts && opts.eMin ? opts.eMin : 20000,
        }

        // Handle failure modes
        if (options.range < 1) return ERR_INVALID_ARGS;
        if (this.store.getFreeCapacity(type) === 0) return ERR_FULL;
        if (this.cooldown > 0) return ERR_TIRED;
        if (this.store.energy < options.eMin) return ERR_NOT_ENOUGH_ENERGY;

        // Fetch price range
        const priceData = this.fetchPrice(type)
        if (priceData.price === 0) return ERR_NOT_FOUND
        let maxPrice = priceData.price + (priceData.std * options.stddev)
        // TODO: Modify to be per resource
        if (maxPrice == undefined) maxPrice = 10000;

        // Find order
        const orders = Game.market.getAllOrders({ type: ORDER_SELL, resourceType: type });
        if (orders.length < 1) return ERR_NOT_FOUND;

        let bestOrder;
        for (const order of orders) {
            if (!order.roomName) continue;
            let dist = Game.map.getRoomLinearDistance(this.room.name, order.roomName, true);
            if (!dist || dist > options.range) continue;
            if (order.price < (bestOrder ? bestOrder.price : maxPrice)) bestOrder = order;
        }
        if (!bestOrder) return ERR_NOT_FOUND;

        // Limit quantity based on send cost
        let sendCost = Game.market.calcTransactionCost(options.quantity, this.room.name, bestOrder.roomName ? bestOrder.roomName : this.room.name);
        while (sendCost > this.store[RESOURCE_ENERGY]) {
            options.quantity = Math.floor(options.quantity * (options.eMin / sendCost));
            sendCost = Game.market.calcTransactionCost(options.quantity, this.room.name, bestOrder.roomName ? bestOrder.roomName : this.room.name);
        }

        // Buy the resource
        Utils.Logger.log(`Buy ${type} bestOrder: ${bestOrder.id}, ${bestOrder.price}, ${bestOrder.amount}, dist: ${bestOrder.roomName ? Game.map.getRoomLinearDistance(this.room.name, bestOrder.roomName, true) : undefined}.`, DEBUG)
        if (Memory.autoMarket === true) return Game.market.deal(bestOrder.id, Math.min(bestOrder.amount, options.quantity), this.room.name);
        return OK;
    }

    private _fetchPrice: {[Property in ResourceConstant]?: MarketPrice} | undefined;
    fetchPrice(resource: ResourceConstant, daysAgo?: number, dayRange?: number): MarketPrice {
        if (!this._fetchPrice) this._fetchPrice = {}
        if (!this._fetchPrice[resource]) {
            const history = Game.market.getHistory(resource);
            if (!daysAgo || daysAgo > 14 || daysAgo < 0) daysAgo = 14
            if (!dayRange || dayRange > 14 || dayRange < 1) dayRange = 3

            // Extract values for averaging
            let average = 0
            let std = 0
            for (let i = dayRange; i > 0; i--) {
                average += history[daysAgo - i + 1].avgPrice
                std += history[daysAgo - i + 1].stddevPrice
            }

            // Average
            average = average / dayRange
            std = std / dayRange

            this._fetchPrice[resource] = {
                price: average,
                std: std
            }
        }

        if (!this._fetchPrice[resource]) return { price: 0, std: 0 }

        return this._fetchPrice[resource]!
    }
}
