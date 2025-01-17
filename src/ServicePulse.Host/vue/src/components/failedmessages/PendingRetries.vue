<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { licenseStatus } from "../../composables/serviceLicense.js";
import { connectionState } from "../../composables/serviceServiceControl.js";
import { useEndpoints } from "../../composables/serviceEndpoints";
import { useFetchFromServiceControl, usePostToServiceControl, usePatchToServiceControl } from "../../composables/serviceServiceControlUrls.js";
import { useShowToast } from "../../composables/toast.js";
import { useCookies } from "vue3-cookies";
import OrderBy from "./OrderBy.vue";
import LicenseExpired from "../../components/LicenseExpired.vue";
import ServiceControlNotAvailable from "../ServiceControlNotAvailable.vue";
import MessageList from "./MessageList.vue";
import ConfirmDialog from "../ConfirmDialog.vue";

let refreshInterval = undefined;
let sortMethod = undefined;
const cookies = useCookies().cookies;
const selectedPeriod = ref("All Pending Retries");
const endpoints = ref([]);
const messageList = ref();
const messages = ref([]);
const selectedQueue = ref("empty");
const showConfirmRetry = ref(false);
const showConfirmResolve = ref(false);
const showConfirmResolveAll = ref(false);
const showCantRetryAll = ref(false);
const showRetryAllConfirm = ref(false);
const pageNumber = ref(1);
const numberOfPages = ref(1);
const totalCount = ref(0);
const sortOptions = [
  {
    description: "Time of failure",
    selector: function (group) {
      return group.title;
    },
    icon: "bi-sort-",
  },
  {
    description: "Message Type",
    selector: function (group) {
      return group.count;
    },
    icon: "bi-sort-alpha-",
  },
  {
    description: "Time of retry request",
    selector: function (group) {
      return group.count;
    },
    icon: "bi-sort-",
  },
];
const periodOptions = ["All Pending Retries", "Retried in the last 2 Hours", "Retried in the last 1 Day", "Retried in the last 7 Days"];

function loadEndpoints() {
  const loader = new useEndpoints();
  loader.getQueueNames().then((queues) => {
    endpoints.value = queues.map((endpoint) => endpoint.physical_address);
  });
}

function clearSelectedQueue() {
  selectedQueue.value = "empty";
  loadPendingRetryMessages();
}

function loadPendingRetryMessages() {
  let startDate = new Date(0);
  let endDate = new Date();

  switch (selectedPeriod.value) {
    case "Retried in the last 2 Hours":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 2);
      break;

    case "Retried in the last 1 Day":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24);
      break;

    case "Retried in the last 7 days":
      startDate = new Date();
      startDate.setHours(startDate.getHours() - 24 * 7);
      break;
  }

  return loadPagedPendingRetryMessages(pageNumber.value, sortMethod.description.replaceAll(" ", "_").toLowerCase(), sortMethod.dir, selectedQueue.value, startDate.toISOString(), endDate.toISOString());
}

function loadPagedPendingRetryMessages(page, sortBy, direction, searchPhrase, startDate, endDate) {
  if (typeof sortBy === "undefined") sortBy = "time_of_failure";
  if (typeof direction === "undefined") direction = "desc";
  if (typeof page === "undefined") page = 1;
  if (typeof searchPhrase === "undefined" || searchPhrase === "empty") searchPhrase = "";
  if (typeof startDate === "undefined") startDate = new Date(0).toISOString();
  if (typeof endDate === "undefined") endDate = new Date().toISOString();

  return useFetchFromServiceControl(`errors?status=retryissued&page=${page}&sort=${sortBy}&direction=${direction}&queueaddress=${searchPhrase}&modified=${startDate}...${endDate}`)
    .then((response) => {
      totalCount.value = parseInt(response.headers.get("Total-Count"));
      numberOfPages.value = Math.ceil(totalCount.value / 50);

      return response.json();
    })
    .then((response) => {
      messages.value.forEach((previousMessage) => {
        const receivedMessage = response.find((m) => m.id === previousMessage.id);
        if (receivedMessage) {
          if (previousMessage.last_modified == receivedMessage.last_modified) {
            receivedMessage.submittedForRetrial = previousMessage.submittedForRetrial;
            receivedMessage.resolved = previousMessage.resolved;
          }

          receivedMessage.selected = previousMessage.selected;
        }
      });

      messages.value = response;
    })
    .catch((err) => {
      console.log(err);
      var result = {
        message: "error",
      };
      return result;
    });
}

function numberDisplayed() {
  return messageList?.value?.numberDisplayed();
}

function isAnythingDisplayed() {
  return messageList?.value?.isAnythingDisplayed();
}

function isAnythingSelected() {
  return messageList?.value?.isAnythingSelected();
}

function numberSelected() {
  return messageList?.value?.getSelectedMessages()?.length ?? 0;
}

function retrySelectedMessages() {
  const selectedMessages = messageList.value.getSelectedMessages();

  useShowToast("info", "Info", "Selected messages were submitted for retry...");
  return usePostToServiceControl(
    "pendingretries/retry",
    selectedMessages.map((m) => m.id)
  ).then(() => {
    messageList.value.deselectAll();
    selectedMessages.forEach((m) => (m.submittedForRetrial = true));
  });
}

function resolveSelectedMessages() {
  const selectedMessages = messageList.value.getSelectedMessages();

  useShowToast("info", "Info", "Selected messages were marked as resolved.");
  return usePatchToServiceControl("pendingretries/resolve", { uniquemessageids: selectedMessages.map((m) => m.id) }).then(() => {
    messageList.value.deselectAll();
    selectedMessages.forEach((m) => (m.resolved = true));
  });
}

function resolveAllMessages() {
  useShowToast("info", "Info", "All filtered messages were marked as resolved.");
  return usePatchToServiceControl("pendingretries/resolve", { from: new Date(0).toISOString(), to: new Date().toISOString() }).then(() => {
    messageList.value.deselectAll();
    messageList.value.forEach((m) => (m.resolved = true));
  });
}

function retryAllMessages() {
  let url = "pendingretries/retry";
  const data = {};
  if (selectedQueue.value !== "empty") {
    url = "pendingretries/queues/retry";
    data.queueaddress = selectedQueue.value;
  }

  data.from = new Date(0).toISOString();
  data.to = new Date().toISOString();

  return usePostToServiceControl(url, data).then(() => {
    messages.value.forEach((message) => {
      message.selected = false;
      message.submittedForRetrial = true;
      message.retried = false;
    });
  });
}

function retryAllClicked() {
  if (selectedQueue.value === "empty") {
    showCantRetryAll.value = true;
  } else {
    showRetryAllConfirm.value = true;
  }
}

function nextPage() {
  pageNumber.value = pageNumber.value + 1;
  if (pageNumber.value > numberOfPages.value) {
    pageNumber.value = numberOfPages.value;
  }
  loadPendingRetryMessages();
}

function previousPage() {
  pageNumber.value = pageNumber.value - 1;
  if (pageNumber.value == 0) {
    pageNumber.value = 1;
  }
  loadPendingRetryMessages();
}

function setPage(page) {
  pageNumber.value = page;
  loadPendingRetryMessages();
}

function sortGroups(sort, isInitialLoad) {
  sortMethod = sort;

  if (!isInitialLoad) {
    loadPendingRetryMessages();
  }
}

function periodChanged(period) {
  selectedPeriod.value = period;
  cookies.set("pending_retries_period", period);

  loadPendingRetryMessages();
}

onUnmounted(() => {
  if (typeof refreshInterval !== "undefined") {
    clearInterval(refreshInterval);
  }
});

onMounted(() => {
  let cookiePeriod = cookies.get("pending_retries_period");
  if (!cookiePeriod) {
    cookiePeriod = periodOptions[0]; //default All Pending Retries
  }

  selectedPeriod.value = cookiePeriod;

  loadEndpoints();

  loadPendingRetryMessages();

  refreshInterval = setInterval(() => {
    loadPendingRetryMessages();
  }, 5000);
});
</script>

<template>
  <LicenseExpired />
  <template v-if="!licenseStatus.isExpired">
    <ServiceControlNotAvailable />
    <template v-if="!connectionState.unableToConnect">
      <section name="pending_retries">
        <div class="row">
          <div class="col-12">
            <div class="alert alert-info"><i class="fa fa-info-circle"></i> To check if a retried message was also processed successfully, enable <a href="https://docs.particular.net/nservicebus/operations/auditing" target="_blank">message auditing</a> <i class="fa fa-external-link fake-link"></i></div>
          </div>
        </div>
        <div class="row">
          <div class="col-6">
            <div class="filter-input">
              <div class="input-group mb-3">
                <label class="input-group-text"><i class="fa fa-filter" aria-hidden="true"></i> <span class="hidden-xs">Filter</span></label>
                <select class="form-select" id="inputGroupSelect01" onchange="this.dataset.chosen = true;" @change="loadPendingRetryMessages()" v-model="selectedQueue">
                  <option selected disabled hidden class="placeholder" value="empty">Select a queue...</option>
                  <option v-for="(endpoint, index) in endpoints" :key="index" :value="endpoint">{{ endpoint }}</option>
                </select>
                <span class="input-group-btn">
                  <button type="button" @click="clearSelectedQueue()" class="btn btn-default"><i class="fa fa-times" aria-hidden="true"></i></button>
                </span>
              </div>
            </div>
          </div>
          <div class="col-6">
            <div class="msg-group-menu dropdown">
              <label class="control-label">Period:</label>
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
            <OrderBy @sort-updated="sortGroups" :hideGroupBy="true" :sortOptions="sortOptions" sortSavePrefix="pending_retries"></OrderBy>
          </div>
        </div>
        <div class="row">
          <div class="col-6 col-xs-12 toolbar-menus">
            <div class="action-btns">
              <button type="button" class="btn btn-default" :disabled="!isAnythingSelected()" @click="showConfirmRetry = true"><i class="fa fa-repeat"></i> <span>Retry</span> ({{ numberSelected() }})</button>
              <button type="button" class="btn btn-default" :disabled="!isAnythingSelected()" @click="showConfirmResolve = true"><i class="fa fa-check-square-o"></i> <span>Mark as resolved</span> ({{ numberSelected() }})</button>
              <button type="button" class="btn btn-default" :disabled="!isAnythingDisplayed()" @click="retryAllClicked()"><i class="fa fa-repeat"></i> <span>Retry all</span></button>
              <button type="button" class="btn btn-default" @click="showConfirmResolveAll = true"><i class="fa fa-check-square-o"></i> <span>Mark all as resolved</span></button>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="col-12">
            <MessageList :messages="messages" ref="messageList"></MessageList>
          </div>
        </div>
        <div class="row">
          <div class="col align-self-center">
            <ul class="pagination justify-content-center">
              <li class="page-item" :class="{ disabled: pageNumber == 1 }">
                <a class="page-link" href="#" @click.prevent="previousPage">Previous</a>
              </li>
              <li v-for="n in numberOfPages" class="page-item" :class="{ active: pageNumber == n }" :key="n">
                <a @click.prevent="setPage(n)" class="page-link" href="#">{{ n }}</a>
              </li>
              <li class="page-item">
                <a class="page-link" href="#" @click.prevent="nextPage" :class="{ disabled: pageNumber >= numberOfPages }">Next</a>
              </li>
            </ul>
          </div>
        </div>
        <Teleport to="#modalDisplay">
          <ConfirmDialog
            v-if="showConfirmRetry === true"
            @cancel="showConfirmRetry = false"
            @confirm="
              showConfirmRetry = false;
              retrySelectedMessages();
            "
            :heading="'Are you sure you want to retry the selected messages?'"
            :body="'Ensure that the selected messages were not processed previously as this will create a duplicate message.'"
            :second-paragraph="'NOTE: If the selection includes messages to be processed via unaudited endpoints, those messages will need to be marked as resolved once the retry is manually verified'"
          ></ConfirmDialog>

          <ConfirmDialog
            v-if="showConfirmResolve === true"
            @cancel="showConfirmResolve = false"
            @confirm="
              showConfirmResolve = false;
              resolveSelectedMessages();
            "
            :heading="'Are you sure you want to mark as resolved the selected messages?'"
            :body="`If you mark these messages as resolved they will not be available for Retry. Messages should only be marked as resolved only if they belong to unaudited endpoints.`"
          ></ConfirmDialog>

          <ConfirmDialog
            v-if="showConfirmResolveAll === true"
            @cancel="showConfirmResolveAll = false"
            @confirm="
              showConfirmResolveAll = false;
              resolveAllMessages();
            "
            :heading="'Are you sure you want to resolve all messages?'"
            :body="`Are you sure you want to mark all ${numberDisplayed()} messages as resolved? If you do they will not be available for Retry.`"
          ></ConfirmDialog>

          <ConfirmDialog v-if="showCantRetryAll === true" @cancel="showCantRetryAll = false" @confirm="showCantRetryAll = false" :hide-cancel="true" :heading="'Select a queue first'" :body="'Bulk retry of messages can only be done for one queue at the time to avoid producing unwanted message duplicates.'"></ConfirmDialog>

          <ConfirmDialog
            v-if="showRetryAllConfirm === true"
            @cancel="showRetryAllConfirm = false"
            @confirm="
              showRetryAllConfirm = false;
              retryAllMessages();
            "
            :heading="'Confirm retry of all messages?'"
            :body="'Are you sure you want to retry all previously retried messages? If the selected messages were processed in the meanwhile, then duplicate messages will be produced.'"
          ></ConfirmDialog>
        </Teleport>
      </section>
    </template>
  </template>
</template>

<style>
.input-group-text {
  margin-bottom: 0;
}

.input-group-text > span {
  font-size: 14px;
  padding-left: 5px;
  color: #555;
}

.input-group > select {
  font-size: 14px;
  color: #777777;
}

.input-group > select[data-chosen="true"] {
  color: #212529;
}

.input-group > select:hover {
  box-shadow: 0 0 10px 100px var(--bs-btn-hover-bg) inset;
  color: #212529;
}

.input-group-btn:last-child > .btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.action-btns > .btn {
  margin-right: 5px;
}
</style>
