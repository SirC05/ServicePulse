<script setup>
import { ref, onMounted } from "vue";
import { licenseStatus } from "../../composables/serviceLicense.js";
import { connectionState } from "../../composables/serviceServiceControl.js";
import { useFetchFromServiceControl } from "../../composables/serviceServiceControlUrls";
import { useCookies } from "vue3-cookies";
import LicenseExpired from "../../components/LicenseExpired.vue";
import ServiceControlNotAvailable from "../ServiceControlNotAvailable.vue";
import LastTenOperations from "../failedmessages/LastTenOperations.vue";
import MessageGroupList from "../failedmessages/MessageGroupList.vue";
import OrderBy from "./OrderBy.vue";

const selectedClassifier = ref(null);
const classifiers = ref([]);
const messageGroupList = ref();
const orderBy = ref();
const sortMethod = ref(() => {});

function sortGroups(sort) {
  sortMethod.value = sort.sort ?? orderBy.value.getSortFunction(sort.selector, "asc");

  // force a re-render of the messagegroup list
  messageGroupList.value.loadFailedMessageGroups();
}

const sortOptions = [
  {
    description: "Name",
    selector: function (group) {
      return group.title;
    },
    icon: "bi-sort-alpha-",
  },
  {
    description: "Number of messages",
    selector: function (group) {
      return group.count;
    },
    icon: "bi-sort-numeric-",
  },
  {
    description: "First Failed Time",
    selector: function (group) {
      return group.first;
    },
    icon: "bi-sort-",
  },
  {
    description: "Last Failed Time",
    selector: function (group) {
      return group.last;
    },
    icon: "bi-sort-",
  },
  {
    description: "Last Retried Time",
    selector: function (group) {
      return group.last_operation_completion_time;
    },
    icon: "bi-sort-",
  },
];

function getGroupingClassifiers() {
  return useFetchFromServiceControl("recoverability/classifiers")
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      classifiers.value = data;
    });
}

function saveDefaultGroupingClassifier(classifier) {
  const cookies = useCookies().cookies;
  cookies.set("failed_groups_classification", classifier);
}

function classifierChanged(classifier) {
  selectedClassifier.value = classifier;
  saveDefaultGroupingClassifier(classifier);
  messageGroupList.value.loadFailedMessageGroups(classifier);
}

function loadDefaultGroupingClassifier() {
  const cookies = useCookies().cookies;
  let cookieGrouping = cookies.get("failed_groups_classification");

  if (cookieGrouping) {
    return cookieGrouping;
  }

  return null;
}

onMounted(() => {
  getGroupingClassifiers().then(() => {
    let savedClassifier = loadDefaultGroupingClassifier();

    if (!savedClassifier) {
      savedClassifier = classifiers.value[0];
    }

    selectedClassifier.value = savedClassifier;
    messageGroupList.value.loadFailedMessageGroups(savedClassifier);
  });
});
</script>

<template>
  <LicenseExpired />
  <template v-if="!licenseStatus.isExpired">
    <ServiceControlNotAvailable />
    <template v-if="!connectionState.unableToConnect">
      <section name="message_groups">
        <LastTenOperations></LastTenOperations>
        <div class="row">
          <div class="col-6 list-section">
            <h3>Failed message group</h3>
          </div>
          <div class="col-6 toolbar-menus no-side-padding">
            <div class="msg-group-menu dropdown">
              <label class="control-label">Group by:</label>
              <button type="button" class="btn btn-default dropdown-toggle sp-btn-menu" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {{ selectedClassifier }}
                <span class="caret"></span>
              </button>
              <ul class="dropdown-menu">
                <li v-for="(classifier, index) in classifiers" :key="index">
                  <a @click.prevent="classifierChanged(classifier)">{{ classifier }}</a>
                </li>
              </ul>
            </div>
            <OrderBy @sort-updated="sortGroups" :sortOptions="sortOptions" ref="orderBy"></OrderBy>
          </div>
        </div>
        <div class="box-container">
          <div class="row">
            <div class="col-12">
              <div class="list-section">
                <div class="col-12 form-group">
                  <MessageGroupList :sortFunction="sortMethod" ref="messageGroupList"></MessageGroupList>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>
  </template>
</template>
