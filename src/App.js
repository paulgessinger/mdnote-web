import React, { Component } from 'react';
//import lego from './logo.svg';
import './App.css';
import Day from "./Day";
import {API_URL} from "./const";
import { Router, Route, Link, browserHistory } from 'react-router';

//import highlight from 'highlight.js';
//highlight.initHighlightingOnLoad();
//import "highlight.js/styles/highlight.css";

import moment from 'moment';

//import InfiniteCalendar from 'react-infinite-calendar';
//import 'react-infinite-calendar/styles.css';
import DayPicker from 'react-day-picker';
import "react-day-picker/lib/style.css"
import Dropzone from 'react-dropzone';

//window.API_URL = "http://localhost:3001";

class App extends Component {
  constructor() {
    super();
    this.state = {
      html: '',
      //selectedDay: new Date(),
      availableDays: [],
    }
  }

  async componentWillMount() {
    const url = API_URL+"/days";
    const res = await fetch(url);
    const data = await res.json();

    //console.log(data);
    this.setState({availableDays: data});
  }
  /*
          <InfiniteCalendar
            width={400}
            height={600}
            selectedDate={this.state.selectedDay}
            keyboardSupport={true}
            afterSelect={this.onSelect.bind(this)}
          />
   * */
  render() {
    //var minDate = Number(new Date()) - (24*60*60*1000) * 7;
    
    const mklink = (day, text) => <Link to={"/"+day.format("YYYY-MM-DD")}>{text}</Link>;

    var day = moment(this.props.params.day);
  
    const ad = this.state.availableDays;
    const dayidx = ad.indexOf(this.props.params.day);
    //const prev = dayidx > 0 ? <Link to={"/"+}
    //console.log(dayidx, ad);
    var prev = null;
    if(dayidx > 0) {
      const preday = moment(ad[dayidx-1]);
      prev = <Link to={"/"+preday.format("YYYY-MM-DD")}>Back</Link>;
    }

    var next = null;
    if(dayidx < ad.length-1) {
      const nextday = moment(ad[dayidx+1]);
      next = <Link to={"/"+nextday.format("YYYY-MM-DD")}>Next</Link>;
    }

    if(dayidx === -1) {
      const first = moment(ad[0]);
      const last = moment(ad[ad.length-1]);
      const diff_first = day.diff(first);
      const diff_last = day.diff(last);
      //console.log(diff_first, diff_last);
      if(diff_first < 0 && diff_last < 0) {
        next = mklink(first, "Next");
        prev = null;
      }

      if(diff_first > 0 && diff_last > 0) {
        prev = mklink(last, "Prev");
        next = null;
      }
    }

    const today = <Link to={"/"+moment().format("YYYY-MM-DD")}>Today</Link>


    return (
      <div className="App">
        <div className="calendar">
          <DayPicker
          enableOutsideDays
          selectedDays={ day.toDate()}
          disabledDays={this.isDayDisabled.bind(this)}
          onDayClick={ this.onSelect.bind(this) }
        />
        {prev} {today} {next}
        <div className="drop">
          <Dropzone onDrop={this.onDrop.bind(this)}>
            <div>drop</div>
          </Dropzone>
        </div>
        </div>
        <Day day={day}/>
      </div>
    );
  }
  
  async onDrop(files) {
    var data = new FormData()
    data.append('file', files[0])
    //data.append('user', 'hubot')
    //
    var day = moment(this.props.params.day);
    const url = API_URL+"/days/"+day.format("YYYY-MM-DD")+"/upload"
    await fetch(url, {method:"POST", body: data});
  }

  //<Day html={this.state.html} day={moment(this.state.selectedDay)}/>
  isDayDisabled(day) {
    var m = moment(day);
    var fmt = m.format("YYYY-MM-DD");
    return this.state.availableDays.indexOf(fmt) === -1;
  }

  async onSelect(date) {
    var m = moment(date)
    //this.setState({selectedDay: date});
    browserHistory.push('/'+m.format("YYYY-MM-DD"));
  }
}

class NotFound extends Component {
  render() {
    return (
      <div>no route found</div>
    );
  }
}

class Root extends Component {
  render() {
    return (
      <Router history={browserHistory}>
        <Route path="/(:day)" component={App}/>
        <Route path="*" component={NotFound}/>
      </Router>
    )
  }
}

export default Root;
