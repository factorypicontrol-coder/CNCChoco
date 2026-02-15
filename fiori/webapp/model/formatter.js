sap.ui.define([
    "sap/ui/core/ValueState",
    "sap/ui/core/format/DateFormat"
], function (ValueState, DateFormat) {
    "use strict";

    return {
        statusState: function (sStatus) {
            switch (sStatus) {
                case "Pending":
                    return ValueState.Warning;
                case "Printing":
                    return ValueState.Information;
                case "Completed":
                    return ValueState.Success;
                case "Cancelled_by_User":
                case "Cancelled_by_Admin":
                    return ValueState.Error;
                default:
                    return ValueState.None;
            }
        },

        statusIcon: function (sStatus) {
            switch (sStatus) {
                case "Pending":
                    return "sap-icon://pending";
                case "Printing":
                    return "sap-icon://print";
                case "Completed":
                    return "sap-icon://accept";
                case "Cancelled_by_User":
                case "Cancelled_by_Admin":
                    return "sap-icon://decline";
                default:
                    return "sap-icon://question-mark";
            }
        },

        statusText: function (sStatus) {
            if (!sStatus) {
                return "";
            }
            return sStatus.replace(/_/g, " ");
        },

        formatDate: function (iTimestamp) {
            if (!iTimestamp) {
                return "";
            }
            var oDate = new Date(iTimestamp * 1000);
            var oFormat = DateFormat.getDateTimeInstance({
                style: "medium"
            });
            return oFormat.format(oDate);
        },

        formatName: function (sFirst, sLast) {
            var aParts = [];
            if (sFirst) { aParts.push(sFirst); }
            if (sLast) { aParts.push(sLast); }
            return aParts.join(" ");
        },

        isPending: function (sStatus) {
            return sStatus === "Pending";
        },

        connectionStatusText: function (bConnected, sPort) {
            if (bConnected) {
                return "Connected (" + sPort + ")";
            }
            return "Disconnected";
        },

        connectionStatusState: function (bConnected) {
            return bConnected ? ValueState.Success : ValueState.Error;
        },

        connectionStatusIcon: function (bConnected) {
            return bConnected ? "sap-icon://connected" : "sap-icon://disconnected";
        }
    };
});
