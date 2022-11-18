"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class SomeComponent {
    constructor(diComponent) {
        this.diComponent = diComponent;
    }
    async aMethod(id, version) {
        return this.diComponent.aMethod(id, version);
    }
    async bMethod(id, version) {
        return this.diComponent.bMethod(id, version);
    }
    async cMethod(id, tag) {
        return this.diComponent.cMethod(id, tag);
    }
    *dMethod(id) {
        return this.diComponent.dMethod(id);
    }
}
exports.default = SomeComponent;
//# sourceMappingURL=fixture.js.map