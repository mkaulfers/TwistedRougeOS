import { TRACE, INFO } from 'Constants';
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
        const history = Game.market.getHistory(type);
        let minPrice = history[0]?.avgPrice - (history[0]?.stddevPrice * options.stddev)
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
        Utils.Logger.log(`Sell ${type} bestOrder: ${bestOrder.id}, ${bestOrder.price}, ${bestOrder.amount}, dist: ${bestOrder.roomName ? Game.map.getRoomLinearDistance(this.room.name, bestOrder.roomName, true) : undefined}.`, INFO)
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
        const history = Game.market.getHistory(type);
        let maxPrice = history[0]?.avgPrice + (history[0]?.stddevPrice * options.stddev)
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
        Utils.Logger.log(`Buy ${type} bestOrder: ${bestOrder.id}, ${bestOrder.price}, ${bestOrder.amount}, dist: ${bestOrder.roomName ? Game.map.getRoomLinearDistance(this.room.name, bestOrder.roomName, true) : undefined}.`, INFO)
        if (Memory.autoMarket === true) return Game.market.deal(bestOrder.id, Math.min(bestOrder.amount, options.quantity), this.room.name);
        return OK;
    }

}
