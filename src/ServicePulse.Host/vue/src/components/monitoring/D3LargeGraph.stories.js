import D3LargeGraph from "./D3LargeGraph.vue";
/*import { expect } from "@storybook/jest";*/
export default {
    component: D3LargeGraph,
    title: "Monitoring/EndpointDetails/D3LargeGraph",
    tags: ["autodocs"],
    //👇 Our events will be mapped in Storybook UI
    argTypes: {},
};

//stories

export const Default = {

    minimumyaxis: 10,
    avglabelcolor: "#EA7E00",
    isdurationgraph: false,
    metricsuffix: "MSGS",
    csclass: "large-graph pull-left",
    args: {
        firstdataseries: {
            average: 0.0,
            points: [0.0, 0.0, 0.0, 3.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        },
    plotwidth: 750,
    plotheight: 200,
    firstseriescolor: "#EA7E00",
    firstseriesfillcolor: "#EADDCE",
    secondseriescolor: "",
    secondseriesfillcolor: "",
  },
};

export const ThroughputRetries = {

    minimumyaxis: 10,
    avglabelcolor: "#EA7E00",
    isdurationgraph: false,
    metricsuffix: "MSGS/S",
    csclass: "large-graph pull-left",
    args: {
        firstdataseries: {
            average: 0.0,
            points: [0.0, 0.0, 0.0, 3.0, 1.0, 1.0, 1.0, 2.0, 1.0, 0.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
        },
        seconddataseries: {
            average: 0.0,
            points: [7.0, 9.0, 5.0, 9.0, 1.0, 19.0, 1.0, 6.0, 1.0, 0.0, 12.0, 7.0, 11.0, 12.0, 1.0, 8.0, 9.0, 1.0, 1.0, 7.0, 1.0, 0.0, 7.0, 1.0, 1.0, 11.0, 1.0, 1.0, 5.0, 1.0, 1.0, 4.0, 5.0, 1.0, 1.0, 9.0, 5.0, 2.0, 1.0, 1.0, 1.0, 1.0, 1.0, 4.0, 1.0, 3.0, 1.0, 4.0, 5.0, 10.0, 1.0, 11.0, 1.0, 1.0, 12.0, 1.0, 1.0, 6.0, 7.0, 8.0],
        },
        plotwidth: 750,
        plotheight: 200,
        firstseriescolor: "#176397",
        firstseriesfillcolor: "#CADCE8",
        secondseriescolor: "#CC1252",
        secondseriesfillcolor: "#E9C4D1",
    },
};