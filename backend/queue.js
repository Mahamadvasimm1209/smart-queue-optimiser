class Queue {
    constructor() {
        this.list = [];
        this.historyServiceTimes = [];
        this.lastId = 0;
    }

    _nextId() {
        return ++this.lastId;
    }

    _priorityFromType(type) {
        if (type === "emergency") return 0;
        if (type === "appointment") return 1;
        return 2;
    }

    enqueue({ name, type = "normal", estimatedServiceTime = 300000 }) {
        const id = this._nextId();
        const priority = this._priorityFromType(type);
        const item = { id, name, type, priority, createdAt: Date.now(), estimatedServiceTime };
        this.list.push(item);
        this.list.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
        return item;
    }

    dequeue() {
        if (this.list.length === 0) return null;
        const item = this.list.shift();
        this.historyServiceTimes.push(item.estimatedServiceTime);
        if (this.historyServiceTimes.length > 500) this.historyServiceTimes.shift();
        return item;
    }

    remove(id) {
        const index = this.list.findIndex(x => x.id === id);
        if (index === -1) return false;
        this.list.splice(index, 1);
        return true;
    }

    getQueue() {
        return this.list.map((x, i) => ({
            position: i + 1,
            id: x.id,
            name: x.name,
            type: x.type
        }));
    }

    predictWaitTimeForPosition(position) {
        const avg = this._average(this.historyServiceTimes) || 300000;
        return avg * position;
    }

    _average(arr) {
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
}

module.exports = Queue;
