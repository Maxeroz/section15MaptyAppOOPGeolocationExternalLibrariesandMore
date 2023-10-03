'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, coordsFinish, distance, duration) {
    this.coords = coords; // [lan, lng]
    this.coordsFinish = coordsFinish;
    this.distance = distance; // in km
    this.duration = duration; // in min
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, coordsFinish, distance, duration, cadence) {
    super(coords, coordsFinish, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // min/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cylcing extends Workout {
  type = 'cycling';

  constructor(coords, coordsFinish, distance, duration, elevationGain) {
    super(coords, coordsFinish, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/h
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], [0, 0], 5.2, 24, 178);
// const cycling1 = new Cylcing([39, 12], 27, 95, 523);
// console.log(run1, cycling1);
// console.log(run1);

/////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const modalOverlay = document.querySelector('.modal__overlay');
const modal = document.querySelector('.modal');

const modalConfirm = document.querySelector('.confirm__delete__all');
const btnAccept = document.querySelector('.accept');

const sideBar = document.querySelector('.sidebar');
const modalStartFinish = document.querySelector('.start__finish');
const modalInputsCheck = document.querySelector('.inputs__check');

const btnShowAll = document.querySelector('.btnShowAll');
const sortInput = document.querySelector('.sort');
const btnDeleteAll = document.querySelector('.btnDeleteAll');
const btnCloseModal = document.querySelector('.close');

let routes = [];
const markers = [];
const distance = '';

const starterModal = document.querySelector('.starter');

let workoutObj;
let numberWorkout = 0;

let clicksOnMap = 0;
// console.log(modalContainer);
// console.log(btnCloseModal);

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];
  #mapEventFinish;

  constructor() {
    // Get user's position

    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Ability to sort
    this._eventSortBtn();

    this._sortCheck();

    // Render starting modal window
    this._renderStartedModal();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    this._workoutOptions();
    btnDeleteAll.addEventListener('click', this._deleteAllWorkouts.bind(this));
    btnCloseModal.addEventListener('click', this._closeModal);
    document.addEventListener('keydown', this._closeModalKey.bind(this));
    modalOverlay.addEventListener('click', this._closeModal);
    btnShowAll.addEventListener('click', this._showAllWorkouts.bind(this));
    modalOverlay.addEventListener('click', this._closeConfirmation);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        this._showErrorModal
      );
    // function ()
    //   alert('Could not get your position');
  }

  _loadMap(position) {
    //Loading the map

    const { latitude, longitude } = position.coords;
    // console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);
    // console.log(this.#map);

    // Handling clicks on map
    ///////////////////////////////////////////////////////////////////

    this.#map.on('click', this._showForm.bind(this));
    ///////////////////////////////////////////////////////////////////

    // this.#workouts.forEach(work => this._rederWorkoutMarker(work));
    this.#workouts.forEach(work => this._routingControl(work));

    // this._routingControl();
  }

  _showForm(mapE) {
    // Choosing coords for START and FINISH

    // Checking if form is alive, if yes : prevent clicks on the map
    if (form.classList.contains('show-form')) return;

    // Hide STARTER modal
    starterModal.classList.add('starter-hidden');

    // Adding START coords for workout
    if (clicksOnMap === 0) {
      this.#mapEvent = mapE;

      // Render modal START FINISH points

      modalStartFinish.style.opacity = 0.9;
      modalStartFinish.textContent = "You've just chosen starting point";

      clicksOnMap = 1;
      console.log(clicksOnMap);
    }

    // Adding FINISH coords for workout
    else if (clicksOnMap === 1) {
      modalStartFinish.style.opacity = 0;
      modalStartFinish.style.opacity = 0.9;
      modalStartFinish.textContent = "You've just chosen finishing point";
      this.#mapEventFinish = mapE;

      clicksOnMap = 0;

      starterModal.classList.add('starter-hidden');
      form.classList.remove('hidden');
      inputDistance.focus();

      // Adding class to form, for preventing clicks while form is alive
      form.classList.add('show-form');
    }
  }

  _hideForm() {
    // Empty inputs
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);

    // Render starting modal window
    starterModal.classList.add('starter-hidden');
    this._renderStartedModal();
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Get data from from
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    const { lat: latFinish, lng: lngFinish } = this.#mapEventFinish.latlng;

    let workout;

    // If workout running, create running object
    if (type === 'running') {
      const cadence = +inputCadence.value;
      // Check if data is valid
      if (
        // !Number.isFinite(distance) ||
        // !Number.isFinite(duration) ||
        // !Number.isFinite(cadence)
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      ) {
        modalStartFinish.style.opacity = 0;
        starterModal.classList.add('starter-hidden');
        modalInputsCheck.classList.add('inputs__check__show');
        return;
      }

      // return alert('Inputs have to be positive numbers!');

      workout = new Running(
        [lat, lng],
        [latFinish, lngFinish],
        distance,
        duration,
        cadence
      );
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      ) {
        modalStartFinish.style.opacity = 0;
        starterModal.classList.add('starter-hidden');
        modalInputsCheck.classList.add('inputs__check__show');
        return;
      }

      workout = new Cylcing(
        [lat, lng],
        [latFinish, lngFinish],
        distance,
        duration,
        elevation
      );
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    // this._rederWorkoutMarker(workout);
    this._routingControl(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Hide modal START/FINISH
    modalStartFinish.style.opacity = 0;

    // Set local storage to all workouts
    this._setLocalStorage();

    // Attaching event listener to edit and delete options
    this._workoutOptions();

    // Render sorting form from the side bar
    this._sortCheck();

    // Render STARTER modal
    modalInputsCheck.classList.remove('inputs__check__show');

    // Removing class to form, for allowing clicks while form is gone
    form.classList.remove('show-form');
  }

  _rederWorkoutMarker(workout) {
    markers.push(
      new L.marker(workout.coords, { icon: null })
        .addTo(this.#map)
        .bindPopup(
          L.popup({
            maxWidhth: 250,
            minWidth: 100,
            autoClose: false,
            closeOnClick: false,
            className: `${workout.type}-popup`,
          })
        )
        .setPopupContent(
          `${workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '} ${workout.description}`
        )
        .openPopup()
    );
  }

  _renderWorkout(workout) {
    // Create later, not able to get access to summary property of route
    const currentRoute = routes[numberWorkout];
    // const { totalDistance, totalTime } = currentRoute._selectedRoute;
    // console.log(totalDistance, totalTime);

    numberWorkout++;

    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>

        <div class="dropdown">
            <select name="ability" class="options select__input">
              <option selected value="choose--option">Choose Option</option>
              <option value="workout--edit">Edit</option>
              <option value="workout--delete">Delete</option>
              
            </select>
          <button class="btnSave">Save</butto>
          </div>
        
        <div class="workout__details">
          <span class="workout__icon">${
            workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '
          }</span>
          <span class="workout__value workout__edit__distance__${numberWorkout}">${
      workout.distance
    }</span>
         <span class="workout__unit">km</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">⏱</span>
         <span class="workout__value workout__edit__duration__${numberWorkout}">${
      workout.duration
    }</span>
         <span class="workout__unit">min</span>
        </div>`;

    if (workout.type === 'running') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value workout__edit__pace__${numberWorkout}">${workout.pace.toFixed(
        1
      )}</span>
          <span class="workout__unit">min/km</span>
        </div>
        <div class="workout__details">
         <span class="workout__icon">🦶🏼</span>
         <span class="workout__value workout__edit__cadence__${numberWorkout}">${
        workout.cadence
      }</span>
         <span class="workout__unit">spm</span>
        </div>
      </li>
      `;
    }

    if (workout.type === 'cycling') {
      html += `
        <div class="workout__details">
          <span class="workout__icon">⚡️</span>
          <span class="workout__value workout__edit__speed__${numberWorkout}">${workout.speed.toFixed(
        1
      )}</span>
          <span class="workout__unit">km/h</span>
        </div>
        <div class="workout__details">
          <span class="workout__icon">⛰</span>
          <span class="workout__value workout__edit__elevationGain__${numberWorkout}">${
        workout.elevationGain
      }</span>
          <span class="workout__unit">m</span>
        </div>
      </li>
      `;
    }

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    if (!workout) return;

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animation: true,
      pan: {
        duration: 1,
      },
    });

    // using the public interface
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    // Get items from local storage with prototype chain

    const data = JSON.parse(localStorage.getItem('workouts'));
    // console.log(data);
    if (!data) return;

    let type;
    let dataProto = [];

    for (let i = 0; i < data.length; i++) {
      data[i].type === 'running'
        ? `${dataProto.push(Object.assign(new Running(), data[i]))}`
        : `${dataProto.push(Object.assign(new Cylcing(), data[i]))}`;
    }

    if (!dataProto) return;

    this.#workouts = dataProto;

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }

  _workoutOptions() {
    // e.preventDefault();
    const optiontsBtn = document.querySelectorAll('.options');

    // console.log(optiontsBtn);

    if (!optiontsBtn) return;

    optiontsBtn.forEach(opt =>
      opt.addEventListener('change', this._editWorkout.bind(this))
    );
  }

  _editWorkout(e) {
    // const workouts = this.#workouts;
    // console.log(workouts);

    this._setEditAttribute(e.target);
  }

  _setEditAttribute(target) {
    // Set attribute contenteditable to workout options

    const workouts = this.#workouts;
    let workoutId;
    const opt = target;

    const btnSave = opt.closest('.workout').querySelector('.btnSave');
    // console.log(opt);
    // console.log(this);
    workoutId = opt.closest('.workout').dataset.id;
    workoutObj = workouts.find(work => work.id === workoutId);

    // Checking option value = EDIT WORKOUT
    if (opt.value === 'workout--edit') {
      console.log('Edit');

      // Rendering edit text for STARTER modal
      starterModal.classList.add('starter-hidden');

      setTimeout(function () {
        starterModal.classList.remove('starter-hidden');
        starterModal.textContent = 'Edit chosen workout';
      }, 50);

      // EDIT WORKOUT FEATURE
      const editValueArray = opt
        .closest('.workout')
        .querySelectorAll('.workout__value');
      // console.log(editValueArray);
      for (let i = 0; i < editValueArray.length; i++) {
        editValueArray[i].setAttribute('contenteditable', 'true');
      }

      // Event delegation event listener: preventing input line breaks by pressing ENTER
      target.closest('.workout').addEventListener('keydown', function (e) {
        if (e.target.closest('.workout__value')) {
          // console.log(e.target);
          // if (e.keyCode == 13) e.preventDefault();
        }
      });

      btnSave.addEventListener('click', this._editUIandLocalStorage.bind(this));
    }

    // Checking option value = DELETE WORKOUT
    if (opt.value === 'workout--delete') {
      btnSave.textContent = 'Accept';
      btnSave.addEventListener('click', this._deleteWorkout.bind(this));

      // Rendering delete text for STARTER modal
      starterModal.classList.add('starter-hidden');

      setTimeout(function () {
        starterModal.classList.remove('starter-hidden');
        starterModal.textContent = 'Delete chosen workout';
      }, 50);
    }
    // Back to choosing options
    starterModal.classList.add('starter-hidden');

    if (opt.value === 'choose--option') {
      setTimeout(function () {
        starterModal.classList.remove('starter-hidden');
        starterModal.textContent = 'Choose starting point for one more workout';
      }, 50);
    }
  }

  _editUIandLocalStorage(e) {
    const workouts = this.#workouts;

    // Choosing object from objectd array to edit
    const index = workouts.findIndex(work => work.id === workoutObj.id) + 1;
    console.log(index);

    // Common properties for both : Running and Cycling
    const editDistance = +document.querySelector(
      `.workout__edit__distance__${index}`
    ).textContent;
    // console.log(editDistance);
    workoutObj.distance = editDistance;
    const editDuration = +document.querySelector(
      `.workout__edit__duration__${index}`
    ).textContent;
    workoutObj.duration = editDuration;

    // Specific Running Properties
    if (workoutObj.type === 'running') {
      const editPace = +document.querySelector(`.workout__edit__pace__${index}`)
        .textContent;
      workoutObj.pace = editPace;

      const editCadence = +document.querySelector(
        `.workout__edit__cadence__${index}`
      ).textContent;
      workoutObj.cadence = editCadence;
    }

    // Specific Cycling Properties
    if (workoutObj.type === 'cycling') {
      const editSpeed = +document.querySelector(
        `.workout__edit__speed__${index}`
      ).textContent;
      workoutObj.speed = editSpeed;

      const editElevation = +document.querySelector(
        `.workout__edit__elevationGain__${index}`
      ).textContent;
      workoutObj.elevationGain = editElevation;
    }

    this._setLocalStorage(workouts);
    this._removeAttribute(e);

    this._renderStartedModal();

    // Back to default STARTER modal
    starterModal.classList.add('starter-hidden');

    setTimeout(function () {
      starterModal.classList.remove('starter-hidden');
      starterModal.textContent = 'Choose starting point for one more workout';
    }, 450);
  }

  _removeAttribute(e) {
    const editValueArray = e.target
      .closest('.workout')
      .querySelectorAll('.workout__value');

    for (let i = 0; i < editValueArray.length; i++) {
      editValueArray[i].removeAttribute('contenteditable', 'false');
    }
  }

  _deleteWorkout(e) {
    const workouts = this.#workouts;

    // Delete workout from array
    const index = this.#workouts.findIndex(work => work.id === workoutObj.id);
    this.#workouts.splice(index, 1);
    console.log(index);

    // Delete marker from map
    const startAndFinishMarkers = markers[index];

    // Delete route from map
    routes[index].remove();
    // routes = [];

    routes.splice(index, 1);

    for (let i = 0; i < startAndFinishMarkers.length; i++) {
      this.#map.removeLayer(startAndFinishMarkers[i]);
    }

    // Delete workout from the list
    e.target.closest('.workout').remove();
    this._setLocalStorage(workouts);

    // Check if workouts more than 1, then render or remove input sort
    this._sortCheck();

    // Back starter to default
    starterModal.classList.add('starter-hidden');

    setTimeout(function () {
      starterModal.classList.remove('starter-hidden');
      starterModal.textContent = 'Choose your starting point';
    }, 450);
  }

  _deleteAllWorkouts(e) {
    // Render confirmation modal with overlay
    modalOverlay.classList.add('show');
    modalConfirm.classList.add('show');
    starterModal.classList.add('starter-hidden');

    const deleteAll = function () {
      // Removing sorting form from the side bar
      sortInput.classList.add('sort__hidden');
      // Empty array with workouts
      this.#workouts = [];
      // Deleting workouts from the sidebar :

      // Deleting workouts form localStorage
      this._setLocalStorage(this.#workouts);

      // Add display "none" style to current workouts
      const workoutEl = document.querySelectorAll('.workout');
      workoutEl.forEach(work => (work.style.display = 'none'));

      const allWorkouts = Array.from(
        e.target.closest('.workouts').getElementsByClassName('workout')
      );

      allWorkouts.forEach(work => {
        work.classList.add('select__hidden');
        work.remove();
      });
      // console.log(allWorkouts.length);

      // Deleting markers from the map
      for (let i = 0; i < allWorkouts.length; i++) {
        // Delete all routes from map
        routes[i].remove();

        // this.#map.removeLayer(markers[i]);
      }
      routes = [];

      modalOverlay.classList.remove('show');
      modalConfirm.classList.remove('show');

      setTimeout(function () {
        starterModal.classList.remove('starter-hidden');
        starterModal.textContent = 'Choose your starting point';
      }, 450);
    };

    btnAccept.addEventListener('click', deleteAll.bind(this));
  }

  _eventSortBtn() {
    const btnSort = document.querySelector('.btnSort');

    // Add event listener on btn sort
    btnSort.addEventListener('click', this._sortWorkouts.bind(this));
  }

  _sortWorkouts(e) {
    e.preventDefault();

    const workouts = this.#workouts;

    // Add hidden class to all displayed workouts
    const allWorkouts = e.target
      .closest('.workouts')
      .querySelectorAll('.workout');
    allWorkouts.forEach(work => work.classList.add('sorting__hidden'));

    // Creating condition for sorting input
    const inputSortValue = document.querySelector('.input__sort').value;

    // Sort by Distance
    this._sortBy(inputSortValue);
  }

  _sortCheck() {
    // Display sort inputs only when workouts >= 2
    const workouts = this.#workouts;

    workouts.length >= 2
      ? sortInput.classList.remove('sort__hidden')
      : sortInput.classList.add('sort__hidden');

    // if (workouts.length >= 2) sortInput.classList.remove('sort__hidden');
    // if (workouts.length < 2) sortInput.classList.add('sort__hidden');
  }

  _sortBy(val) {
    // Sorting workouts according to input field value
    const property = val.toLowerCase();
    const workouts = this.#workouts;

    // Creating condition for sorting input
    const inputSort = document.querySelector('.input__sort');

    workouts.sort((a, b) => a[property] - b[property]);
    inputSort.value = '';

    // console.log(workouts);
    // this._setLocalStorage(workouts);
    workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  _showErrorModal() {
    // Render modal with error message
    modalOverlay.classList.add('show');
    modal.classList.add('show');
    // Hide modal START/FINISH
    starterModal.style.opacity = 0;
  }

  _closeModal() {
    // Hide modal by clicking close button
    modalOverlay.classList.remove('show');
    modal.classList.remove('show');
  }

  _closeConfirmation() {
    // Hide confirmation modal by clicking Esc
    modalOverlay.classList.remove('show');
    modalConfirm.classList.remove('show');
  }

  _closeModalKey(e) {
    if (e.key === 'Escape' && modalOverlay.classList.contains('show')) {
      this._closeModal();
    }
    if (e.key === 'Escape' && modalConfirm.classList.contains('show')) {
      this._closeConfirmation();
    }
  }

  _showAllWorkouts() {
    // Position view to show all workouts on the map
    const group = new L.featureGroup(markers.flat());
    this.#map.fitBounds(group.getBounds());
  }

  _chooseIcon(point) {
    // Choosing icon for both START AND FINISH POINTS
    const icon = L.icon({
      iconUrl: `${point}.png`,

      iconSize: [32, 32], // size of the icon
      iconAnchor: [16, 32], // point of the icon which will correspond to marker's location
      popupAnchor: [0, -25], // point from which the popup should open relative to the iconAnchor
    });
    return icon;
  }

  _routingControl(workout) {
    // Creating icons for both points START end FINISH
    const createIcon = function (point) {
      const icon = L.icon({
        iconUrl: `${point}.png`,

        iconSize: [32, 32], // size of the icon
        iconAnchor: [16, 32], // point of the icon which will correspond to marker's location
        popupAnchor: [0, -25], // point from which the popup should open relative to the iconAnchor
      });
      return icon;
    };

    if (this.#workouts.length === 0) return;

    const [latStart, lngStart] = workout.coords;
    const [latFinish, lngFinish] = workout.coordsFinish;
    const workoutMarkers = [];
    // console.log(latStart, latFinish);
    const startAndFinishMarkers = [];

    let marker;

    const route = new L.Routing.control({
      waypoints: [L.latLng(latStart, lngStart), L.latLng(latFinish, lngFinish)],
      createMarker: function (i, start, n) {
        let marker_icon = null;
        if (i === 0) {
          // The first marker = START
          marker_icon = createIcon('start');
        } else if (i == n - 1) {
          marker_icon = createIcon('finish');
        }

        marker = L.marker(start.latLng, {
          draggable: false,
          bounceOnAdd: false,
          bounceOnAddOptions: {
            duration: 1000,
            height: 800,
            autoClose: false,
            closeOnClick: false,
          },
          icon: marker_icon,
        });

        workoutMarkers.push(marker);
        startAndFinishMarkers.push(marker);
        return marker;
      },
    }).addTo(this.#map);

    console.log(startAndFinishMarkers);

    startAndFinishMarkers.forEach((marker, i) => {
      if (i === 0) {
        marker
          .bindPopup(
            L.popup({
              maxWidhth: 250,
              minWidth: 100,
              autoClose: false,
              closeOnClick: false,
              className: `${workout.type}-popup`,
            })
          )
          .setPopupContent(
            `${workout.type === 'running' ? '🏃‍♂️ ' : '🚴‍♀️ '} ${
              workout.description
            }`
          )
          .openPopup();
      }
    });

    console.log(route);
    routes.push(route);

    markers.push(workoutMarkers);

    // const headingDistance = document
    //   .querySelectorAll('.leaflet-routing-container')
    //   .forEach(container => {
    //     console.log(container.querySelector('.leaflet-routing-alt '));
    //   });

    // console.log(headingDistance);
    // document.querySelector('h3');
  }

  _renderStartedModal() {
    // Function to change state of STARTER modal
    const changeStarterState = function (state) {
      if (state === 'oneMore') {
        starterModal.classList.add('starter-hidden');
        starterModal.textContent = 'Choose starting point for one more workout';
        starterModal.classList.remove('starter-hidden');
      }
    };

    const workouts = this.#workouts;

    setTimeout(function () {
      starterModal.classList.remove('starter-hidden');
      if (workouts.length >= 1) {
        changeStarterState('oneMore');
      }
    }, 400);
  }
}

const app = new App();

// Features:

// 1) Ability to edit a workout
// 2) Ability to delete a workout
// 3) Ability to delete all workouts
// 4) Ability to sort workouts by a certain field (e.g distance)
// 5) Re-build Running and Cylcing objects from Local Storage
// 6) More realistic error and confirmation messages
// 7) Ability to draw lines and shaped instead of just points
