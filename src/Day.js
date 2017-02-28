import React, { Component, PropTypes } from 'react';
//import moment from 'moment';
import {API_URL} from "./const";
import "highlight.js/styles/default.css";
import CodeMirror from 'react-codemirror';
import 'codemirror/mode/markdown/markdown';
import "codemirror/lib/codemirror.css";
import 'codemirror/keymap/vim';

import "./Day.css";

import io from "socket.io-client";
import {renderMarkdown} from './common';

var socket = io("http://localhost:3001");
//const io = window.io;

export default class Day extends Component {
  constructor(props) {
    super(props);
    this.state = {
      //html: '',
      md: '',
      exists:false,
      edit:false,
      tainted:false,
    };
  }

  static propTypes = {
    //html: PropTypes.string.isRequired,
    day: PropTypes.object.isRequired,
  }

  //async load(day) {
    //const url = API_URL+"/days/"+day.format("YYYY-MM-DD");
    //const res = await fetch(url);
      
    ////console.log(res);
    //if(res.status === 404) {
      //// does not exists
      //this.setState({html: null, exists:false});
      //return;
    //}

    //const html = await res.text();
    //this.setState({html:html, exists:true});
  //}

  open(day) {
    socket.emit("open", {file: ""+day.format("YYYY-MM-DD")});
  }

  close(day) {
    socket.emit("close", {file: ""+day.format("YYYY-MM-DD")});
  }

  update(data) {
    //console.log("update", data);
    if(data.exists) {
      this.setState({
        //html: data.html, 
        md:data.md, 
        exists: true,
        tainted:false,
      });
    }
    else {
      this.setState({
        //html: "", 
        md:'', 
        exists:false,
        tainted:false,
      });
    }
  }

  componentWillMount() {
    this.open(this.props.day);
    socket.on("update", this.update.bind(this));
    
    socket.on('connect', () => {
      this.open(this.props.day);
    });
    //var m = moment(this.props.params.day);
    //this.load(this.props.day);
    //io.on("connection", (socket) => {
      //console.log("io connect");
    //});
  }

  componentWillReceiveProps(props) {
    //console.log("CWRP");
    //this.load(props.day);
    const old_day = this.props.day.format("YYYY-MM-DD");
    const new_day = props.day.format("YYYY-MM-DD");
    if(old_day !== new_day) {
      this.close(this.props.day);
      this.open(props.day);
    }
  }
  
  rewriteImages(html) {

    html = html.replace(/src="(.+?)"/g, (m, s) => {
      const url = API_URL + "/" + s;
      return `src="${url}"`;
    });

    html = html.replace(/<object.+data="(.+?)".+>/g, (m, s) => {
      const url = API_URL + "/" + s + "#toolbar=0&navpanes=0&scrollbar=0";
      //console.log(m);
      const fixed = m.replace(/data="(.+?)"/g, `data="${url}"`);
      return fixed;
    });

    return html;
  }

  async create(e) {
    e.preventDefault();
    e.stopPropagation();
    
    //const day = this.props.day.format("DD.MM.YYYY");
    const day_url = this.props.day.format("YYYY-MM-DD");

    socket.emit("create", {day: day_url});
    //var res = await fetch(API_URL+"/days/"+day_url, {method:"POST"});
    //var html = await res.text();
    ////console.log(html);
    //this.setState({html: html, create:false});
    //location.reload();
  }

  toggleEdit() {
    //console.log("toggleEdit");
    this.setState({edit:!this.state.edit});
  }

  saveChanges() {
    var cm = this.refs.editor.getCodeMirror();
    const md = cm.getValue();
    //console.log(md);

    socket.emit("save", {
      day:this.props.day, 
      md:md,
      tainted:false,
    });
    //this.setState({edit:false});
  }

  renderMarkdown(md) {
    var html = renderMarkdown(md);
    html = this.rewriteImages(html);
    return html;
  }

  onChange(value) {
    //console.log(value);
    this.setState({md:value, tainted:true});

  }

  render() {
    const day = this.props.day.format("DD.MM.YYYY");
    //const day_url = this.props.day.format("YYYY-MM-DD");
    var body;
    if(!this.state.exists) {
      body = (
        <div>
          <h1>{day}</h1>
          <a href="#" onClick={this.create.bind(this)}>create new</a>
        </div>
      );
    } else {

      //var html = this.rewriteImages(this.state.html);
      const html = this.renderMarkdown(this.state.md);

      var inner;
      var bar = [];
      if(this.state.edit) {
        bar.push(<button disabled={!this.state.tainted} key="save" className="save" onClick={this.saveChanges.bind(this)}>save</button>);
        bar.push(<button key="edit" className="edit" onClick={this.toggleEdit.bind(this)}>view</button>);
        inner = (
          <div className="edit_view">
            <div className="preview" dangerouslySetInnerHTML={{__html: html}}></div>
            <div className="editor">
              <CodeMirror
                ref="editor"
                value={this.state.md}
                onChange={this.onChange.bind(this)}
                options={{
                  mode: "markdown",
                  //keyMap: 'vim',
                }}
              />
            </div>
          </div>
        )
      }
      else {
        bar.push(<button key="edit" className="edit" onClick={this.toggleEdit.bind(this)}>edit</button>);
        inner = <div className="md" dangerouslySetInnerHTML={{__html: html}}/>;
      }

      body = (
        <div>
          {inner}
          <div className="bar">{bar}</div>
        </div>
      );
    }

    return (
      <div className="days">
        {body}
      </div>
    );
  }
}

