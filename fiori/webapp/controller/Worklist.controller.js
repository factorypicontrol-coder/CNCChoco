sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "cncchoco/queue/model/formatter"
], function (Controller, JSONModel, Filter, FilterOperator, MessageToast, MessageBox, formatter) {
    "use strict";

    var API_BASE = "/api";

    return Controller.extend("cncchoco.queue.controller.Worklist", {
        formatter: formatter,

        onInit: function () {
            this._oJobDialogModel = new JSONModel({
                mode: "create",
                job: this._emptyJob()
            });
            this.getView().setModel(this._oJobDialogModel, "dialog");

            this._refreshQueue();
            this._refreshConnection();

            this._pollTimer = setInterval(this._refreshQueue.bind(this), 3000);
            this._connTimer = setInterval(this._refreshConnection.bind(this), 10000);
        },

        onExit: function () {
            if (this._pollTimer) { clearInterval(this._pollTimer); }
            if (this._connTimer) { clearInterval(this._connTimer); }
            this._stopPositionPolling();
        },

        // ═══════════════════════════════════════════════════════════════
        // Main Navigation
        // ═══════════════════════════════════════════════════════════════

        onMainTabSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "Statistics") {
                this._stopPositionPolling();
                this._loadStats();
            } else if (sKey === "Configuration") {
                this._stopPositionPolling();
                this._loadConfig();
            } else if (sKey === "Calibration") {
                this._startPositionPolling();
            } else {
                // Queue or anything else
                this._stopPositionPolling();
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // Emergency Stop
        // ═══════════════════════════════════════════════════════════════

        onEStop: function () {
            var oBtn = this.byId("estopBtn");
            oBtn.setEnabled(false);
            oBtn.setText("STOPPING…");

            fetch(API_BASE + "/estop", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageBox.error(
                            this._getText("estopSuccess"),
                            { title: this._getText("estopTitle") }
                        );
                        this._refreshQueue();
                    } else {
                        MessageBox.error(data.error || this._getText("estopError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("estopError"));
                }.bind(this))
                .finally(function () {
                    oBtn.setEnabled(true);
                    oBtn.setText(this._getText("estop"));
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Data Loading — Queue
        // ═══════════════════════════════════════════════════════════════

        _refreshQueue: function () {
            var oQueueModel = this.getOwnerComponent().getModel("queue");
            fetch(API_BASE + "/queue/live")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        var oCounts = data.statusCounts || {};
                        var iAll = (oCounts.Pending || 0) + (oCounts.Printing || 0) +
                            (oCounts.Completed || 0) + (oCounts.Cancelled_by_User || 0) +
                            (oCounts.Cancelled_by_Admin || 0);

                        oQueueModel.setData({
                            jobs: data.jobs || [],
                            isPrinting: data.isPrinting || false,
                            timestamp: data.timestamp,
                            statusCounts: {
                                all: iAll,
                                pending: oCounts.Pending || 0,
                                printing: oCounts.Printing || 0,
                                completed: oCounts.Completed || 0,
                                cancelled: (oCounts.Cancelled_by_User || 0) + (oCounts.Cancelled_by_Admin || 0)
                            }
                        });
                    }
                })
                .catch(function () { /* silently retry on next poll */ });
        },

        _refreshConnection: function () {
            var oCncModel = this.getOwnerComponent().getModel("cnc");
            fetch(API_BASE + "/status")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success && data.status) {
                        oCncModel.setProperty("/connected", data.status.connected);
                        oCncModel.setProperty("/port", data.status.port);
                        oCncModel.setProperty("/availableDevices", data.availableDevices || []);
                    }
                })
                .catch(function () { /* silently retry */ });
        },

        onRefresh: function () {
            this._refreshQueue();
            this._refreshConnection();
            MessageToast.show(this._getText("refreshed"));
        },

        // ═══════════════════════════════════════════════════════════════
        // Filtering
        // ═══════════════════════════════════════════════════════════════

        onFilterSelect: function (oEvent) {
            var sKey = oEvent.getParameter("key");
            var oTable = this.byId("jobTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];

            this.getOwnerComponent().getModel("view").setProperty("/activeFilter", sKey);

            if (sKey === "Pending" || sKey === "Printing" || sKey === "Completed") {
                aFilters.push(new Filter("status", FilterOperator.EQ, sKey));
            } else if (sKey === "Cancelled") {
                aFilters.push(new Filter({
                    filters: [
                        new Filter("status", FilterOperator.EQ, "Cancelled_by_User"),
                        new Filter("status", FilterOperator.EQ, "Cancelled_by_Admin")
                    ],
                    and: false
                }));
            }

            oBinding.filter(aFilters);
        },

        // ═══════════════════════════════════════════════════════════════
        // Selection
        // ═══════════════════════════════════════════════════════════════

        onSelectionChange: function () {
            var oTable = this.byId("jobTable");
            var iCount = oTable.getSelectedItems().length;
            this.getOwnerComponent().getModel("view").setProperty("/selectedCount", iCount);
        },

        onClearSelection: function () {
            this.byId("jobTable").removeSelections(true);
            this.getOwnerComponent().getModel("view").setProperty("/selectedCount", 0);
        },

        // ═══════════════════════════════════════════════════════════════
        // Bulk Actions
        // ═══════════════════════════════════════════════════════════════

        onBulkApply: function () {
            var oTable = this.byId("jobTable");
            var aSelected = oTable.getSelectedItems();
            if (aSelected.length === 0) {
                MessageToast.show(this._getText("noSelection"));
                return;
            }

            var sStatus = this.getOwnerComponent().getModel("view").getProperty("/bulkStatus");
            var aIds = aSelected.map(function (oItem) {
                return oItem.getBindingContext("queue").getProperty("id");
            });

            var sMsg = this._getText("confirmBulk", [aIds.length, sStatus.replace(/_/g, " ")]);
            MessageBox.confirm(sMsg, {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        this._doBulkUpdate(aIds, sStatus);
                    }
                }.bind(this)
            });
        },

        _doBulkUpdate: function (aIds, sStatus) {
            fetch(API_BASE + "/updatejobs/bulk", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: aIds, status: sStatus })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("bulkSuccess", [aIds.length]));
                        this.onClearSelection();
                        this._refreshQueue();
                    } else {
                        MessageBox.error(data.error || this._getText("bulkError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("bulkError"));
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Print
        // ═══════════════════════════════════════════════════════════════

        onPrintNext: function () {
            fetch(API_BASE + "/print")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("printStarted", [data.jobId]));
                        this._refreshQueue();
                    } else {
                        MessageBox.warning(data.error || this._getText("printError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("printError"));
                }.bind(this));
        },

        onPrintJob: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("queue");
            var iId = oCtx.getProperty("id");

            fetch(API_BASE + "/print/" + iId)
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("printStarted", [iId]));
                        this._refreshQueue();
                    } else {
                        MessageBox.warning(data.error || this._getText("printError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("printError"));
                }.bind(this));
        },

        onDownloadScript: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("queue");
            var iId = oCtx.getProperty("id");
            window.open(API_BASE + "/script/" + iId, "_blank");
        },

        // ═══════════════════════════════════════════════════════════════
        // View Job Detail
        // ═══════════════════════════════════════════════════════════════

        onViewJob: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("queue");
            var oJob = oCtx.getObject();

            var oViewModel = new JSONModel(Object.assign({}, oJob));
            if (!this._oViewDialog) {
                this._oViewDialog = sap.ui.xmlfragment("cncchoco.queue.fragment.JobViewDialog", this);
                this.getView().addDependent(this._oViewDialog);
            }
            this._oViewDialog.setModel(oViewModel, "detail");
            this._oViewDialog.open();
        },

        onCloseViewDialog: function () {
            if (this._oViewDialog) { this._oViewDialog.close(); }
        },

        onEditFromView: function () {
            if (this._oViewDialog) {
                var oJob = this._oViewDialog.getModel("detail").getData();
                this._oViewDialog.close();
                this._openJobDialog("edit", oJob);
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // Create / Edit Job
        // ═══════════════════════════════════════════════════════════════

        onCreateJob: function () {
            this._openJobDialog("create", this._emptyJob());
        },

        _openJobDialog: function (sMode, oJob) {
            this._oJobDialogModel.setProperty("/mode", sMode);
            this._oJobDialogModel.setProperty("/job", Object.assign({}, oJob));

            if (!this._oJobDialog) {
                this._oJobDialog = sap.ui.xmlfragment("cncchoco.queue.fragment.JobDetailDialog", this);
                this.getView().addDependent(this._oJobDialog);
            }
            this._oJobDialog.open();
        },

        onSaveJob: function () {
            var sMode = this._oJobDialogModel.getProperty("/mode");
            var oJob = this._oJobDialogModel.getProperty("/job");

            if (!oJob.message_1 || !oJob.message_1.trim()) {
                MessageBox.warning(this._getText("message1Required"));
                return;
            }

            if (sMode === "create") {
                this._createJob(oJob);
            } else {
                this._updateJob(oJob);
            }
        },

        _createJob: function (oJob) {
            var oPayload = {};
            Object.keys(oJob).forEach(function (sKey) {
                if (sKey !== "id" && sKey !== "status" && sKey !== "created_at") {
                    oPayload[sKey] = oJob[sKey] || "";
                }
            });

            fetch(API_BASE + "/createjob", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("jobCreated", [data.id]));
                        this._oJobDialog.close();
                        this._refreshQueue();
                    } else {
                        MessageBox.error(data.error || this._getText("createError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("createError"));
                }.bind(this));
        },

        _updateJob: function (oJob) {
            var oPayload = {};
            Object.keys(oJob).forEach(function (sKey) {
                if (sKey !== "id" && sKey !== "created_at") {
                    oPayload[sKey] = oJob[sKey];
                }
            });

            fetch(API_BASE + "/updatejobs/" + oJob.id, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oPayload)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("jobUpdated"));
                        this._oJobDialog.close();
                        this._refreshQueue();
                    } else {
                        MessageBox.error(data.error || this._getText("updateError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("updateError"));
                }.bind(this));
        },

        onCancelJobDialog: function () {
            if (this._oJobDialog) { this._oJobDialog.close(); }
        },

        // ═══════════════════════════════════════════════════════════════
        // Connection
        // ═══════════════════════════════════════════════════════════════

        onConnectionPress: function () {
            var oCncModel = this.getOwnerComponent().getModel("cnc");
            var bConnected = oCncModel.getProperty("/connected");

            if (bConnected) {
                fetch(API_BASE + "/disconnect", { method: "POST" })
                    .then(function (res) { return res.json(); })
                    .then(function () {
                        this._refreshConnection();
                        MessageToast.show(this._getText("disconnected"));
                    }.bind(this));
            } else {
                fetch(API_BASE + "/connect", { method: "POST" })
                    .then(function (res) { return res.json(); })
                    .then(function (data) {
                        this._refreshConnection();
                        if (data.success) {
                            MessageToast.show(this._getText("connected"));
                        } else {
                            MessageBox.warning(data.error || this._getText("connectError"));
                        }
                    }.bind(this));
            }
        },

        // ═══════════════════════════════════════════════════════════════
        // Statistics
        // ═══════════════════════════════════════════════════════════════

        _loadStats: function () {
            var oStatsModel = this.getOwnerComponent().getModel("stats");
            fetch(API_BASE + "/stats")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        oStatsModel.setData({
                            totals: data.totals || {},
                            statusCounts: data.statusCounts || {},
                            dailyStats: (data.dailyStats || []).slice().reverse()
                        });
                    }
                }.bind(this))
                .catch(function () {
                    MessageToast.show(this._getText("statsLoadError"));
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Configuration
        // ═══════════════════════════════════════════════════════════════

        _loadConfig: function () {
            var oConfigModel = this.getOwnerComponent().getModel("config");
            fetch(API_BASE + "/getConfig")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success && data.config) {
                        var oConfig = data.config;
                        // Ensure use_g54_calibration is a string for Select binding
                        oConfig.use_g54_calibration = String(oConfig.use_g54_calibration);
                        oConfigModel.setData(oConfig);
                    }
                }.bind(this))
                .catch(function () {
                    MessageToast.show(this._getText("configLoadError"));
                }.bind(this));
        },

        onSaveConfig: function () {
            var oConfig = this.getOwnerComponent().getModel("config").getData();

            fetch(API_BASE + "/updateConfig", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oConfig)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("configSaved"));
                    } else {
                        MessageBox.error(data.error || this._getText("configSaveError"));
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("configSaveError"));
                }.bind(this));
        },

        onResetConfig: function () {
            this._loadConfig();
            MessageToast.show(this._getText("configReset"));
        },

        // ═══════════════════════════════════════════════════════════════
        // Calibration — Position Polling
        // ═══════════════════════════════════════════════════════════════

        _startPositionPolling: function () {
            if (this._positionPollTimer) { return; }
            this._refreshPosition();
            this._positionPollTimer = setInterval(this._refreshPosition.bind(this), 500);
        },

        _stopPositionPolling: function () {
            if (this._positionPollTimer) {
                clearInterval(this._positionPollTimer);
                this._positionPollTimer = null;
            }
        },

        _refreshPosition: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            fetch(API_BASE + "/calibrate/position")
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success && data.position) {
                        var pos = data.position;
                        var mpos = pos.mpos || {};
                        var wpos = pos.wpos || {};
                        oCalModel.setProperty("/state", pos.state || "?");
                        oCalModel.setProperty("/mpos/x", this._fmtCoord(mpos.x));
                        oCalModel.setProperty("/mpos/y", this._fmtCoord(mpos.y));
                        oCalModel.setProperty("/mpos/z", this._fmtCoord(mpos.z));
                        oCalModel.setProperty("/wpos/x", this._fmtCoord(wpos.x));
                        oCalModel.setProperty("/wpos/y", this._fmtCoord(wpos.y));
                        oCalModel.setProperty("/wpos/z", this._fmtCoord(wpos.z));
                    }
                }.bind(this))
                .catch(function () { /* silently ignore poll errors */ });
        },

        _fmtCoord: function (val) {
            if (typeof val === "number") { return val.toFixed(3); }
            return "?";
        },

        // ═══════════════════════════════════════════════════════════════
        // Calibration — Home & Unlock
        // ═══════════════════════════════════════════════════════════════

        onHome: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            var oBtn = this.byId("homeBtn");
            oBtn.setEnabled(false);
            oCalModel.setProperty("/homeStatus", this._getText("calHoming"));

            fetch(API_BASE + "/calibrate/home", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("calHomeSuccess"));
                        oCalModel.setProperty("/homeStatus", this._getText("calComplete"));
                        oCalModel.setProperty("/steps/homed", true);
                    } else {
                        MessageBox.error(this._getText("calHomeFailed") + ": " + data.error);
                        oCalModel.setProperty("/homeStatus", this._getText("calFailed"));
                    }
                }.bind(this))
                .catch(function () {
                    oCalModel.setProperty("/homeStatus", this._getText("calError"));
                }.bind(this))
                .finally(function () {
                    oBtn.setEnabled(true);
                }.bind(this));
        },

        onUnlock: function () {
            fetch(API_BASE + "/calibrate/unlock", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        MessageToast.show(this._getText("calUnlocked"));
                    } else {
                        MessageBox.error(this._getText("calUnlockFailed") + ": " + data.error);
                    }
                }.bind(this))
                .catch(function () {
                    MessageBox.error(this._getText("calError"));
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Calibration — Jog
        // ═══════════════════════════════════════════════════════════════

        _doJog: function (sAxis, iDir) {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            var fStep = parseFloat(oCalModel.getProperty("/jogStep")) || 1;
            var fDistance = fStep * iDir;

            fetch(API_BASE + "/calibrate/jog", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ axis: sAxis, distance: fDistance })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        oCalModel.setProperty("/steps/jogged", true);
                    } else {
                        MessageToast.show(this._getText("calJogFailed") + ": " + data.error);
                    }
                }.bind(this))
                .catch(function () { /* ignore transient jog errors */ });
        },

        onJogXPlus:  function () { this._doJog("X",  1); },
        onJogXMinus: function () { this._doJog("X", -1); },
        onJogYPlus:  function () { this._doJog("Y",  1); },
        onJogYMinus: function () { this._doJog("Y", -1); },
        onJogZPlus:  function () { this._doJog("Z",  1); },
        onJogZMinus: function () { this._doJog("Z", -1); },

        onJogCancel: function () {
            fetch(API_BASE + "/calibrate/jog/cancel", { method: "POST" });
        },

        onJogStepChange: function (oEvent) {
            var sKey = oEvent.getParameter("item").getKey();
            this.getOwnerComponent().getModel("calibration").setProperty("/jogStep", sKey);
        },

        // ═══════════════════════════════════════════════════════════════
        // Calibration — Move To
        // ═══════════════════════════════════════════════════════════════

        onMoveTo: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            var sX = oCalModel.getProperty("/gotoX");
            var sY = oCalModel.getProperty("/gotoY");
            var sZ = oCalModel.getProperty("/gotoZ");

            if (sX === "" && sY === "" && sZ === "") {
                MessageToast.show(this._getText("calEnterCoord"));
                return;
            }

            var oBody = {};
            if (sX !== "") { oBody.x = parseFloat(sX); }
            if (sY !== "") { oBody.y = parseFloat(sY); }
            if (sZ !== "") { oBody.z = parseFloat(sZ); }

            oCalModel.setProperty("/moveToStatus", this._getText("calMoving"));

            fetch(API_BASE + "/calibrate/moveto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(oBody)
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        oCalModel.setProperty("/moveToStatus", this._getText("calDone"));
                    } else {
                        MessageBox.error(this._getText("calMoveFailed") + ": " + data.error);
                        oCalModel.setProperty("/moveToStatus", this._getText("calFailed"));
                    }
                }.bind(this))
                .catch(function () {
                    oCalModel.setProperty("/moveToStatus", this._getText("calError"));
                }.bind(this));
        },

        onGoToOrigin: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            oCalModel.setProperty("/moveToStatus", this._getText("calMovingOrigin"));

            fetch(API_BASE + "/calibrate/moveto", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ x: 0, y: 0, z: 0 })
            })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        oCalModel.setProperty("/moveToStatus", this._getText("calAtOrigin"));
                    } else {
                        MessageBox.error(this._getText("calMoveFailed") + ": " + data.error);
                        oCalModel.setProperty("/moveToStatus", this._getText("calFailed"));
                    }
                }.bind(this))
                .catch(function () {
                    oCalModel.setProperty("/moveToStatus", this._getText("calError"));
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Calibration — Set Origin & Dry Run
        // ═══════════════════════════════════════════════════════════════

        onSetOrigin: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");

            fetch(API_BASE + "/calibrate/setorigin", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        var mp = data.machinePosition || {};
                        var sPos = "(" + (mp.x || 0).toFixed(3) + ", " + (mp.y || 0).toFixed(3) + ", " + (mp.z || 0).toFixed(3) + ")";
                        MessageToast.show(this._getText("calOriginSet"));
                        oCalModel.setProperty("/originStatus", this._getText("calOriginAt") + " " + sPos);
                        oCalModel.setProperty("/steps/originSet", true);
                    } else {
                        MessageBox.error(this._getText("calOriginFailed") + ": " + data.error);
                        oCalModel.setProperty("/originStatus", this._getText("calFailed"));
                    }
                }.bind(this))
                .catch(function () {
                    oCalModel.setProperty("/originStatus", this._getText("calError"));
                }.bind(this));
        },

        onDryRun: function () {
            var oCalModel = this.getOwnerComponent().getModel("calibration");
            var oBtn = this.byId("dryRunBtn");
            oBtn.setEnabled(false);
            oCalModel.setProperty("/dryRunStatus", this._getText("calRunning"));

            fetch(API_BASE + "/calibrate/dryrun", { method: "POST" })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    if (data.success) {
                        var b = data.boundary || {};
                        MessageToast.show(this._getText("calDryRunSuccess"));
                        oCalModel.setProperty("/dryRunStatus",
                            this._getText("calComplete") + " (" + b.width + "x" + b.height + "mm)");
                        oCalModel.setProperty("/steps/verified", true);
                    } else {
                        MessageBox.error(this._getText("calDryRunFailed") + ": " + data.error);
                        oCalModel.setProperty("/dryRunStatus", this._getText("calFailed"));
                    }
                }.bind(this))
                .catch(function () {
                    oCalModel.setProperty("/dryRunStatus", this._getText("calError"));
                }.bind(this))
                .finally(function () {
                    oBtn.setEnabled(true);
                }.bind(this));
        },

        // ═══════════════════════════════════════════════════════════════
        // Helpers
        // ═══════════════════════════════════════════════════════════════

        _emptyJob: function () {
            return {
                first_name: "",
                last_name: "",
                email_address: "",
                phone_number: "",
                question_1: "",
                question_2: "",
                question_3: "",
                best_contact: "",
                contact_details: "",
                reach_out_next_month: "yes",
                message_1: "",
                message_2: "",
                agreement: "yes"
            };
        },

        _getText: function (sKey, aArgs) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return oBundle.getText(sKey, aArgs);
        }
    });
});
