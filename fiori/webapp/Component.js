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

            this.setModel(new JSONModel({
                totals: {
                    total_jobs_created: 0,
                    total_jobs_completed: 0,
                    total_jobs_cancelled: 0,
                    total_lines_printed: 0,
                    total_chars_printed: 0
                },
                statusCounts: {
                    Pending: 0,
                    Printing: 0,
                    Completed: 0,
                    Cancelled_by_User: 0,
                    Cancelled_by_Admin: 0
                },
                dailyStats: []
            }), "stats");

            this.setModel(new JSONModel({
                bar_width: 100,
                bar_height: 40,
                template_text: "",
                template_font: "logo",
                template_font_size: 8,
                template_alignment: "centered",
                message_font: "hershey",
                message_font_size_1_line: 8,
                message_font_size_2_lines: 5,
                message_alignment: "centered",
                gap_template_to_message: 2,
                gap_between_lines: 1,
                z_safe_height: 5,
                z_engrave_depth: -0.3,
                feed_rate: 800,
                use_g54_calibration: "true",
                jog_feed_rate: 1000
            }), "config");

            this.setModel(new JSONModel({
                state: "?",
                mpos: { x: "?", y: "?", z: "?" },
                wpos: { x: "?", y: "?", z: "?" },
                jogStep: "1",
                homeStatus: "",
                originStatus: "",
                dryRunStatus: "",
                moveToStatus: "",
                gotoX: "",
                gotoY: "",
                gotoZ: "",
                steps: {
                    homed: false,
                    jogged: false,
                    originSet: false,
                    verified: false
                }
            }), "calibration");

            this.getRouter().initialize();
        }
    });
});
