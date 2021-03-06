// Licensed under the Apache License, Version 2.0 (the "License"); you may not
// use this file except in compliance with the License. You may obtain a copy of
// the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations under
// the License.

define([
  'app',
  'api',
  'react',
  'addons/documents/index-editor/stores',
  'addons/documents/index-editor/actions',
  'addons/fauxton/components',
  'plugins/beautify'
],

function(app, FauxtonAPI, React, Stores, Actions, Components, beautifyHelper) {
  var indexEditorStore = Stores.indexEditorStore;
  var getDocUrl = app.helpers.getDocUrl;

  var ToggleButton = React.createClass({

    render: function() {
      return (
        <div className="dashboard-upper-menu">
          <ul className="nav nav-tabs" id="db-views-tabs-nav">
            <li>
              <a ref="toggle" data-bypass="true" id="index-nav" data-toggle="tab" href="#index" onClick={this.props.toggleEditor}>
                <i className="fonticon-wrench fonticon"></i>
                {this.props.title}
              </a>
            </li>
          </ul>
        </div>
      );
    }
  });

  var DesignDocSelector = React.createClass({

    getStoreState: function () {
      return {
        designDocId: indexEditorStore.getDesignDocId(),
        designDocs: indexEditorStore.getDesignDocs(),
        newDesignDoc: indexEditorStore.isNewDesignDoc()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    getNewDesignDocInput: function () {
      return (
        <div id="new-ddoc-section" className="span5">
          <label className="control-label" htmlFor="new-ddoc"> _design/ </label>
          <div className="controls">
            <input value={this.state.designDoc} type="text" id="new-ddoc" onChange={this.onDesignDocChange} placeholder="newDesignDoc" />
          </div>
        </div>
      );
    },

    onDesignDocChange: function (event) {
      Actions.designDocChange('_design/' + event.target.value, true);
    },

    getDesignDocOptions: function () {
      return this.state.designDocs.map(function (doc, i) {
        return <option key={i} value={doc.id}> {doc.id} </option>;
      });
    },

    render: function () {
      var designDocOptions = this.getDesignDocOptions();
      var designDocInput;
      var designDocId = this.state.designDocId;

      if (this.state.newDesignDoc) {
        designDocInput = this.getNewDesignDocInput();
        designDocId = 'new';
      }

      return (
        <div className="control-group design-doc-group">
          <div className="span3">
            <label htmlFor="ddoc">Save to Design Document
              <a className="help-link" data-bypass="true" href={getDocUrl('DESIGN_DOCS')} target="_blank">
                <i className="icon-question-sign">
                </i>
              </a>
            </label>
            <select id="ddoc" value={designDocId} onChange={this.selectChange}>
              <optgroup label="Select a document">
                <option value="new">New Design Document </option>
                {designDocOptions}
              </optgroup>
            </select>
          </div>

          {designDocInput}
        </div>
      );
    },

    selectChange: function (event) {
      var designDocId = event.target.value;

      if (designDocId === 'new') {
        Actions.newDesignDoc();
      } else {
        Actions.designDocChange(designDocId, false);
      }
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    componentDidMount: function () {
      indexEditorStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function() {
      indexEditorStore.off('change', this.onChange);
    },

  });

  var Beautify = React.createClass({
    noOfLines: function () {
      return this.props.code.split(/\r\n|\r|\n/).length;
    },

    canBeautify: function () {
      if (this.noOfLines() === 1) {
        return true;
      }

      return false;
    },

    addTooltip: function () {
      if (this.canBeautify) {
        $('.beautify-tooltip').tooltip();
      }
    },

    componentDidMount: function () {
      this.addTooltip();
    },

    beautify: function (event) {
      event.preventDefault();
      var beautifiedCode = beautifyHelper(this.props.code);
      this.props.beautifiedCode(beautifiedCode);

    },

    render: function () {
      if(!this.canBeautify()) {
        return null;
      }

      return (
        <button onClick={this.beautify} className="beautify beautify_map btn btn-primary btn-large beautify-tooltip" type="button" data-toggle="tooltip" title="Reformat your minified code to make edits to it.">
          beautify this code
        </button>
      );
    }
  });

  var CodeEditor = React.createClass({
    render: function () {
      var code = this.aceEditor ? this.aceEditor.getValue() : this.props.code;
      var docsLink;
      if (this.props.docs) {
        docsLink = <a className="help-link" data-bypass="true" href={getDocUrl(this.props.docs)} target="_blank">
                    <i className="icon-question-sign"></i>
                   </a>;

      }
      return (
        <div className="control-group">
          <label htmlFor="ace-function">
            {this.props.title}
            {docsLink}
          </label>
          <div className="js-editor" id={this.props.id}>{this.props.code}</div>
          <Beautify code={code} beautifiedCode={this.setEditorValue} />
        </div>
      );
    },

    setEditorValue: function (code) {
      this.aceEditor.setValue(code);
      //this is not a good practice normally but because we working with a backbone view as the mapeditor
      //that keeps the map code state this is the best way to force a render so that the beautify button will hide
      this.forceUpdate();
    },

    getValue: function () {
      return this.aceEditor.getValue();
    },

    getEditor: function () {
      return this.aceEditor;
    },

    componentDidMount: function () {
      this.aceEditor = new Components.Editor({
        editorId: this.props.id,
        mode: 'javascript',
        couchJSHINT: true
      });
      this.aceEditor.render();
    },

    shouldComponentUpdate: function () {
      //we don't want to re-render the map editor as we are using backbone underneath
      //which will cause the editor to break
      this.aceEditor.editSaved();

      return false;
    },

    componentWillUnmount: function () {
      this.aceEditor.remove();
    },

  });

  var ReduceEditor = React.createClass({

    getStoreState: function () {
      return {
        reduce: indexEditorStore.getReduce(),
        reduceOptions: indexEditorStore.reduceOptions(),
        reduceSelectedOption: indexEditorStore.reduceSelectedOption(),
        hasCustomReduce: indexEditorStore.hasCustomReduce(),
        hasReduce: indexEditorStore.hasReduce()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    getOptionsList: function () {
      return _.map(this.state.reduceOptions, function (reduce, i) {
        return <option key={i} value={reduce}> {reduce} </option>;
      }, this);

    },

    getReduceValue: function () {
      if (!this.state.hasReduce) {
        return null;
      }

      if (!this.state.hasCustomReduce) {
        return this.state.reduce;
      }

      return this.refs.reduceEditor.getValue();
    },

    getEditor: function () {
      return this.refs.reduceEditor.getEditor();
    },

    render: function () {
      var reduceOptions = this.getOptionsList(),
      customReduceSection;

      if (this.state.hasCustomReduce) {
        //customReduceSection = <CustomReduce ref="reduceEditor" reduce={this.state.reduce} />;
        customReduceSection = <CodeEditor ref='reduceEditor' id={'reduce-function'} code={this.state.reduce} docs={false} title={'Custom Reduce function'} />;
      }

      return (
        <div>
          <div className="control-group">
            <label htmlFor="reduce-function-selector">Reduce (optional)<a className="help-link" data-bypass="true" href={getDocUrl('REDUCE_FUNCS')} target="_blank"><i className="icon-question-sign"></i></a></label>

            <select id="reduce-function-selector" value={this.state.reduceSelectedOption} onChange={this.selectChange}>
              {reduceOptions}
            </select>
          </div>

          {customReduceSection}
        </div>
      );
    },

    selectChange: function (event) {
      Actions.selectReduceChanged(event.target.value);
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    componentDidMount: function () {
      indexEditorStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function() {
      indexEditorStore.off('change', this.onChange);
    },

  });

  var DeleteView = React.createClass({
    getStoreState: function () {
      return {
        isNewView: indexEditorStore.isNewView(),
        designDocs: indexEditorStore.getDesignDocs(),
        viewName: indexEditorStore.getViewName(),
        designDocId: indexEditorStore.getDesignDocId(),
        database: indexEditorStore.getDatabase()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    render: function () {
      if (this.state.isNewView) {
        return null;
      }

      return (
        <button onClick={this.deleteView} className="btn btn-danger delete">
          <i className="icon fonticon-cancel-circled"></i>
          Delete
        </button>
      );
    },

    deleteView: function (event) {
      event.preventDefault();

      if (!confirm('Are you sure you want to delete this view?')) {return;}

      Actions.deleteView({
        designDocs: this.state.designDocs,
        viewName: this.state.viewName,
        designDocId: this.state.designDocId,
        database: this.state.database
      });
    }

  });

  var Editor = React.createClass({
    getStoreState: function () {
      return {
        database: indexEditorStore.getDatabase(),
        isNewView: indexEditorStore.isNewView(),
        viewName: indexEditorStore.getViewName(),
        designDocs: indexEditorStore.getDesignDocs(),
        hasDesignDocChanged: indexEditorStore.hasDesignDocChanged(),
        newDesignDoc: indexEditorStore.isNewDesignDoc(),
        designDocId: indexEditorStore.getDesignDocId(),
        map: indexEditorStore.getMap()
      };
    },

    getInitialState: function () {
      return this.getStoreState();
    },

    onChange: function () {
      this.setState(this.getStoreState());
    },

    componentDidMount: function () {
      indexEditorStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function() {
      indexEditorStore.off('change', this.onChange);
    },

    hasValidCode: function() {
      return _.every(['mapEditor', 'reduceEditor'], function(editorName) {
        if (editorName === 'reduceEditor' && !indexEditorStore.hasCustomReduce()) {
          return true;
        }
        var editor = this.refs[editorName].getEditor();
        return editor.hadValidCode();
      }, this);
    },

    saveView: function (event) {
      event.preventDefault();

      if (!this.hasValidCode()) {
        FauxtonAPI.addNotification({
          msg:  'Please fix the Javascript errors and try again.',
          type: 'error',
          clear: true
        });
        return;
      }

      Actions.saveView({
        database: this.state.database,
        newView: this.state.isNewView,
        viewName: this.state.viewName,
        designDocId: this.state.designDocId,
        newDesignDoc: this.state.newDesignDoc,
        designDocChanged: this.state.hasDesignDocChanged,
        map: this.refs.mapEditor.getValue(),
        reduce: this.refs.reduceEditor.getReduceValue(),
        designDocs: this.state.designDocs
      });
    },

    viewChange: function (event) {
      Actions.changeViewName(event.target.value);
    },

    render: function () {
      return (
        <div className="tab-content" >
          <div className="tab-pane active" id="index">
            <div id="define-view" className="ddoc-alert well">
              <form className="form-horizontal view-query-save" onSubmit={this.saveView}>

                <DesignDocSelector />

                <div className="control-group">
                  <label htmlFor="index-name">Index name<a className="help-link" data-bypass="true" href={getDocUrl('VIEW_FUNCS')} target="_blank"><i className="icon-question-sign"></i></a></label>
                  <input type="text" id="index-name" value={this.state.viewName} onChange={this.viewChange} placeholder="Index name" />
                </div>

                <CodeEditor id={'map-function'} ref="mapEditor" title={"Map function"} docs={'MAP_FUNCS'} code={this.state.map}/>
                <ReduceEditor ref="reduceEditor"/>

                <div className="control-group">
                  <button className="btn btn-success save"><i className="icon fonticon-ok-circled"></i> Save &amp; Build Index</button>
                  <DeleteView />
                </div>
              </form>
            </div>

          </div>
        </div>
      );
    }
  });

  var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

  var EditorController = React.createClass({
    getInitialState: function () {
      return {
        showEditor: indexEditorStore.showEditor(),
        isNewView: indexEditorStore.isNewView(),
        title: indexEditorStore.getTitle(),
        hasCustomReduce: indexEditorStore.hasCustomReduce()
      };
    },

    onChange: function () {
      this.setState({showEditor: indexEditorStore.showEditor()});
    },

    componentDidMount: function() {
      indexEditorStore.on('change', this.onChange, this);
    },

    componentWillUnmount: function() {
      indexEditorStore.off('change', this.onChange);
    },

    toggleEditor: function () {
      Actions.toggleEditor();
    },

    render: function () {
      var editor = null;
      //a bit of hack for now.
      var wrapperClassName = 'editor-wrapper';
      var doTransitions = !this.state.isNewView;
      var editorTransitionName = 'fadeInDownNoReduce';

      if (this.state.showEditor) {
        //key is needed for animation;
        editor = <Editor key={1} />;
        wrapperClassName = '';

        if (this.state.hasCustomReduce) {
          editorTransitionName = 'fadeInDownReduce';
        }
      }

      return (
        <div className={wrapperClassName}>
          <ToggleButton title={this.state.title} toggleEditor={this.toggleEditor} />
          <ReactCSSTransitionGroup transitionName={editorTransitionName} transitionLeave={doTransitions} transitionEnter={doTransitions}>
            {editor}
          </ReactCSSTransitionGroup>
        </div>
      );
    }

  });

  var Views = {
    renderEditor: function (el) {
      React.render(<EditorController/>, el);
    },
    removeEditor: function (el) {
      React.unmountComponentAtNode(el);
    },
    ToggleButton: ToggleButton,
    ReduceEditor: ReduceEditor,
    Editor: Editor,
    DesignDocSelector: DesignDocSelector,
    Beautify: Beautify
  };

  return Views;
});
