sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "cncchoco/queue/model/models"
], function (UIComponent, JSONModel, models) {
    "use strict";

    return UIComponent.extend("cncchoco.queue.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            this.setModel(models.createDeviceModel(), "device");

            this.setModel(new JSONModel({
                jobs: [],
                statusCounts: {},
                isPrinting: false,
                timestamp: null
            }), "queue");

            this.setModel(new JSONModel({
                connected: false,
                port: null,
                availableDevices: []
            }), "cnc");

            this.setModel(new JSONModel({
                selectedCount: 0,
                bulkStatus: "Cancelled_by_Admin",
                activeFilter: "All",
                busy: false
            }), "view");

            this.getRouter().initialize();
        }
    });
});
