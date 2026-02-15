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
            if (this._pollTimer) {
                clearInterval(this._pollTimer);
            }
            if (this._connTimer) {
                clearInterval(this._connTimer);
            }
        },

        // --- Data Loading ---

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

        // --- Filtering ---

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

        // --- Selection ---

        onSelectionChange: function () {
            var oTable = this.byId("jobTable");
            var iCount = oTable.getSelectedItems().length;
            this.getOwnerComponent().getModel("view").setProperty("/selectedCount", iCount);
        },

        onClearSelection: function () {
            this.byId("jobTable").removeSelections(true);
            this.getOwnerComponent().getModel("view").setProperty("/selectedCount", 0);
        },

        // --- Bulk Actions ---

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

        // --- Print ---

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

        // --- View Job Detail ---

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
            if (this._oViewDialog) {
                this._oViewDialog.close();
            }
        },

        onEditFromView: function () {
            if (this._oViewDialog) {
                var oJob = this._oViewDialog.getModel("detail").getData();
                this._oViewDialog.close();
                this._openJobDialog("edit", oJob);
            }
        },

        // --- Create / Edit Job ---

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
            if (this._oJobDialog) {
                this._oJobDialog.close();
            }
        },

        // --- Connection ---

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

        // --- Helpers ---

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
