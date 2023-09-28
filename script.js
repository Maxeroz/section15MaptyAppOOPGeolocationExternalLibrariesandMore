'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  clicks = 0;

  constructor(coords, distance, duration) {
    this.coords = coords; // [lan, lng]
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

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
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

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
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

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cylcing([39, 12], 27, 95, 523);
// console.log(run1, cycling1);

/////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

const markers = [];
let workoutObj;
let numberWorkout = 0;

class App {
  #map;
  #mapZoomLevel = 15;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Get user's position

    this._getPosition();

    // Get data from local storage
    this._getLocalStorage();

    // Ability to sort
    this._eventSortBtn();

    // Attach event handlers
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this.ttoggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    this._workoutOptions();
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
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
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._rederWorkoutMarker(work));
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
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
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If workout cycling, create cycling object
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cylcing([lat, lng], distance, duration, elevation);
    }

    // Add new object to workout array
    this.#workouts.push(workout);

    // Render workout on map as marker
    this._rederWorkoutMarker(workout);

    // Render workout on list
    this._renderWorkout(workout);

    // Hide form + clear input fields
    this._hideForm();

    // Set local storage to all workouts
    this._setLocalStorage();

    this._workoutOptions();
  }

  _rederWorkoutMarker(workout) {
    markers.push(
      new L.marker(workout.coords)
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
    numberWorkout++;

    let html = `
      <li class="workout workout--${workout.type}" data-id="${workout.id}">
        <h2 class="workout__title">${workout.description}</h2>

        <div class="dropdown">
            <select name="ability" class="options select__input">
              <option selected>Choose Option</option>
              <option value="workout--edit">Edit</option>
              <option value="workout--delete">Delete</option>
              <option value="workout--delete--all">Delete All</option>
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
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#workouts = data;

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
      // workoutId = opt.closest('.workout').dataset.id;
      // workoutObj = workouts.find(work => work.id === workoutId);
      // console.log('Edit');
      console.log(workoutObj);
      // .setAttribute('contenteditable', 'true');

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
          if (e.keyCode == 13) event.preventDefault();
        }
      });
      // editValueArray.forEach(opt =>
      //   opt.addEventListener('keydown', function (e) {
      //     // console.log(e.target);
      //     if (e.keyCode == 13) return;
      //   })
      // );

      // const btnSave = opt.closest('.workout').querySelector('.btnSave');

      btnSave.addEventListener('click', this._editUIandLocalStorage.bind(this));
    }

    // Checking option value = DELETE WORKOUT
    if (opt.value === 'workout--delete') {
      btnSave.addEventListener('click', this._deleteWorkout.bind(this));
    }

    // Checking option value = DELETE ALL WORKOUTS
    if (opt.value === 'workout--delete--all') {
      btnSave.addEventListener('click', this._deleteAllWorkouts.bind(this));
    }
  }

  _editUIandLocalStorage(e) {
    console.log('hello');
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
  }

  _removeAttribute(e) {
    const editValueArray = e.target
      .closest('.workout')
      .querySelectorAll('.workout__value');
    // console.log(editValueArray);
    for (let i = 0; i < editValueArray.length; i++) {
      editValueArray[i].removeAttribute('contenteditable', 'false');
    }
  }

  _deleteWorkout(e) {
    const workouts = this.#workouts;

    // Delete workout from array
    const index = this.#workouts.findIndex(work => work.id === workoutObj.id);
    this.#workouts.splice(index);

    // Delete marker from map
    this.#map.removeLayer(markers[index]);

    // Delete workout from the list
    e.target.closest('.workout').classList.add('select__hidden');
    this._setLocalStorage(workouts);

    console.log('Delete');
  }

  _deleteAllWorkouts(e) {
    console.log('Delete All');

    // Empty array with workouts
    this.#workouts = [];

    // Deleting workouts from the sidebar
    const allWorkouts = e.target
      .closest('.workouts')
      .querySelectorAll('.workout');
    allWorkouts.forEach(work => work.classList.add('select__hidden'));
    this._setLocalStorage(this.#workouts);

    // Deleting markers from the map
    for (let i = 0; i < allWorkouts.length; i++) {
      this.#map.removeLayer(markers[i]);
    }
  }

  _eventSortBtn(property) {
    // const inputSortForm = document.querySelector('.sort');
    // console.log(inputSortForm);
    const btnSort = document.querySelector('.btnSort');

    // Add event listener on btn sort
    btnSort.addEventListener('click', this._sortWorkouts.bind(this));
  }

  _sortWorkouts(e) {
    e.preventDefault();

    const workouts = this.#workouts;

    const allWorkouts = e.target
      .closest('.workouts')
      .querySelectorAll('.workout');
    allWorkouts.forEach(work => work.classList.add('select__hidden'));

    const inputSort = document.querySelector('.input__sort');

    if (inputSort.value === 'Distance') {
      workouts.sort((a, b) => a.distance - b.distance);
      inputSort.value = '';
      this._setLocalStorage(workouts);
      workouts.forEach(work => {
        this._renderWorkout(work);
      });

      console.log(workouts);
    }
  }
}

const app = new App();

/////////////////////////////////////////
// Displaying a Map Using Leaflet Library

/////////////////////////////////////////
// Displaying a Map Marker

/////////////////////////////////////////
// Rendering Workout Input Form

/////////////////////////////////////////
// Project Architecture

/////////////////////////////////////////
// Refactoring for Project Architecture

/////////////////////////////////////////
// Managing Workout Data: Creating Classes

/////////////////////////////////////////
// Rendering Workouts

/////////////////////////////////////////
// Move to Marker On Click

/////////////////////////////////////////
// Working with localStorag

/////////////////////////////////////////
// Final Considerations
