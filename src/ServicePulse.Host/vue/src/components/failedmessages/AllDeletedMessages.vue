<script setup>
import { ref, onBeforeMount, onMounted, onUnmounted } from "vue";
import { licenseStatus } from "../../composables/serviceLicense.js";
import { connectionState } from "../../composables/serviceServiceControl.js";
import { useFetchFromServiceControl, usePatchToServiceControl } from "../../composables/serviceServiceControlUrls.js";
import { useShowToast } from "../../composables/toast.js";
import { useRoute, onBeforeRouteLeave } from "vue-router";
import { useCookies } from "vue3-cookies";
import LicenseExpired from "../../components/LicenseExpired.vue";
import ServiceControlNotAvailable from "../ServiceControlNotAvailable.vue";
import MessageList from "./MessageList.vue";
import ConfirmDialog from "../ConfirmDialog.vue";
import moment from "moment";

let pollingFaster = false;
let refreshInterval = undefined;
const configuration = ref([]);

const route = useRoute();
const groupId = ref(route.params.groupId);
const groupName = ref("");
const pageNumber = ref(1);
const numberOfPages = ref(1);
const totalCount = ref(0);
const cookies = useCookies().cookies;
const selectedPeriod = ref("Deleted in the last 7 days");
const showConfirmRestore = ref(false);
const messageList = ref();
const messages = ref([]);
const periodOptions = ["All Deleted", "Deleted in the last 2 Hours", "Deleted in the last 1 Day", "Deleted in the last 7 days"];

function loadMessages() {
  let startDate = new Date(0);
  let endDate = new Date();

  switch (selectedPeriod.value) {
    case "All Deleted":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24 * 365);
      break;
    case "Deleted in the last 2 Hours":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 2);
      break;
    case "Deleted in the last 1 Day":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);
      break;
    case "Deleted in the last 7 days":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24 * 7);
      break;
  }
  return loadPagedMessages(groupId.value, pageNumber.value, "", "", startDate.toISOString(), endDate.toISOString());
}

function loadPagedMessages(groupId, page, sortBy, direction, startDate, endDate) {
  if (typeof sortBy === "undefined") sortBy = "modified";
  if (typeof direction === "undefined") direction = "desc";
  if (typeof page === "undefined") page = 1;
  if (typeof startDate === "undefined") startDate = new Date(0).toISOString();
  if (typeof endDate === "undefined") endDate = new Date().toISOString();
  let dateRange = startDate + "..." + endDate;
  let loadGroupDetails;
  if (groupId && !groupName.value) {
    loadGroupDetails = useFetchFromServiceControl(`archive/groups/id/${groupId}`)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        groupName.value = data.title;
      });
  }

  const loadDelMessages = useFetchFromServiceControl(`${groupId ? `recoverability/groups/${groupId}/` : ""}errors?status=archived&page=${page}&sort=${sortBy}&direction=${direction}&modified=${dateRange}`)
    .then((response) => {
      totalCount.value = parseInt(response.headers.get("Total-Count"));
      numberOfPages.value = Math.ceil(totalCount.value / 50);

      return response.json();
    })
    .then((response) => {
      if (messages.value.length && response.length) {
        // merge the previously selected messages into the new list so we can replace them
        messages.value.forEach((previousMessage) => {
          const receivedMessage = response.find((m) => m.id === previousMessage.id);
          if (receivedMessage) {
            if (previousMessage.last_modified == receivedMessage.last_modified) {
              receivedMessage.retryInProgress = previousMessage.retryInProgress;
              receivedMessage.deleteInProgress = previousMessage.deleteInProgress;
            }

            receivedMessage.selected = previousMessage.selected;
          }
        });
      }

      messages.value = updateMessagesScheduledDeletionDate(response);
    })
    .catch((err) => {
      console.log(err);
      var result = {
        message: "error",
      };
      return result;
    });

  if (loadGroupDetails) {
    return Promise.all([loadGroupDetails, loadDelMessages]);
  }

  return loadDelMessages;
}

function updateMessagesScheduledDeletionDate(messages) {
  //check deletion time
  messages.forEach((message) => {
    message.error_retention_period = moment.duration(configuration.value.data_retention.error_retention_period).asHours();
    var countdown = moment(message.last_modified).add(message.error_retention_period, "hours");
    message.delete_soon = countdown < moment();
    message.deleted_in = countdown.format();
  });
  return messages;
}

function numberSelected() {
  return messageList?.value?.getSelectedMessages()?.length ?? 0;
}

function selectAll() {
  messageList.value.selectAll();
}

function deselectAll() {
  messageList.value.deselectAll();
}

function isAnythingSelected() {
  return messageList?.value?.isAnythingSelected();
}

function nextPage() {
  pageNumber.value = pageNumber.value + 1;
  if (pageNumber.value > numberOfPages.value) {
    pageNumber.value = numberOfPages.value;
  }
  loadMessages();
}

function previousPage() {
  pageNumber.value = pageNumber.value - 1;
  if (pageNumber.value == 0) {
    pageNumber.value = 1;
  }
  loadMessages();
}

function setPage(page) {
  pageNumber.value = page;
  loadMessages();
}

function restoreSelectedMessages() {
  changeRefreshInterval(1000);
  const selectedMessages = messageList.value.getSelectedMessages();
  selectedMessages.forEach((m) => (m.restoreInProgress = true));
  useShowToast("info", "Info", "restoring " + selectedMessages.length + " messages...");

  usePatchToServiceControl(
    "errors/unarchive",
    selectedMessages.map((m) => m.id)
  ).then(() => {
    messageList.value.deselectAll();
  });
}

function periodChanged(period) {
  selectedPeriod.value = period;
  cookies.set("all_deleted_messages_period", period);

  loadMessages();
}

function getConfiguration() {
  return useFetchFromServiceControl("configuration")
    .then((response) => {
      return response.json();
    })
    .then((data) => {
      configuration.value = data;
      return;
    });
}

function isRestoreInProgress() {
  return messages.value.some((message) => message.restoreInProgress);
}

function changeRefreshInterval(milliseconds) {
  if (typeof refreshInterval !== "undefined") {
    clearInterval(refreshInterval);
  }

  refreshInterval = setInterval(() => {
    // If we're currently polling at 5 seconds and there is a restore in progress, then change the polling interval to poll every 1 second
    if (!pollingFaster && isRestoreInProgress()) {
      changeRefreshInterval(1000);
      pollingFaster = true;
    } else if (pollingFaster && !isRestoreInProgress()) {
      // if we're currently polling every 1 second but all restores are done, change polling frequency back to every 5 seconds
      changeRefreshInterval(5000);
      pollingFaster = false;
    }

    loadMessages();
  }, milliseconds);
}

onBeforeRouteLeave(() => {
  groupId.value = undefined;
  groupName.value = undefined;
});

onBeforeMount(() => {
  getConfiguration();
});

onUnmounted(() => {
  if (typeof refreshInterval !== "undefined") {
    clearInterval(refreshInterval);
  }
});

onMounted(() => {
  let cookiePeriod = cookies.get("all_deleted_messages_period");
  if (!cookiePeriod) {
    cookiePeriod = periodOptions[3]; //default is last 7 days
  }
  selectedPeriod.value = cookiePeriod;
  loadMessages();

  changeRefreshInterval(5000);
});
</script>

<template>
  <LicenseExpired />
  <template v-if="!licenseStatus.isExpired">
    <ServiceControlNotAvailable />
    <template v-if="!connectionState.unableToConnect">
      <section name="message_groups">
        <div class="row" v-if="groupName && messages.length > 0">
          <div class="col-sm-12">
            <h1 v-if="groupName" class="active break group-title">
              {{ groupName }}
            </h1>
            <h3 class="active group-title group-message-count">{{ totalCount }} messages in group</h3>
          </div>
        </div>
        <div class="row">
          <div class="col-9">
            <div class="btn-toolbar">
              <button type="button" class="btn btn-default select-all" @click="selectAll" v-if="!isAnythingSelected()">Select all</button>
              <button type="button" class="btn btn-default select-all" @click="deselectAll" v-if="isAnythingSelected()">Clear selection</button>
              <button type="button" class="btn btn-default" @click="showConfirmRestore = true" :disabled="!isAnythingSelected()"><i class="fa fa-repeat"></i> Restore {{ numberSelected() }} selected</button>
            </div>
          </div>
          <div class="col-3">
            <div class="msg-group-menu dropdown">
              <label class="control-label">Show:</label>
              <button type="button" class="btn btn-default dropdown-toggle sp-btn-menu" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                {{ selectedPeriod }}
                <span class="caret"></span>
              </button>
              <ul class="dropdown-menu">
                <li v-for="(period, index) in periodOptions" :key="index">
                  <a @click.prevent="periodChanged(period)">{{ period }}</a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <MessageList :messages="messages" :showRequestRetry="false" ref="messageList"></MessageList>
          </div>
        </div>
        <div class="row" v-if="messages.length > 0">
          <div class="col align-self-center">
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: pageNumber == 1 }">
                <a class="page-link" href="#" @click.prevent="previousPage">Previous</a>
              </li>
              <li v-for="n in numberOfPages" class="page-item" :class="{ active: pageNumber == n }" :key="n">
                <a @click.prevent="setPage(n)" class="page-link" href="#">{{ n }}</a>
              </li>
              <li class="page-item">
                <a class="page-link" href="#" @click.prevent="nextPage">Next</a>
              </li>
            </ul>
          </div>
        </div>
        <Teleport to="#modalDisplay">
          <ConfirmDialog
            v-if="showConfirmRestore"
            @cancel="showConfirmRestore = false"
            @confirm="
              showConfirmRestore = false;
              restoreSelectedMessages();
            "
            :heading="'Are you sure you want to restore the selected messages?'"
            :body="'Restored messages will be moved back to the list of failed messages.'"
          ></ConfirmDialog>
        </Teleport>
      </section>
    </template>
  </template>
</template>

<style></style>
