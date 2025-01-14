import Pagination from "@material-ui/lab/Pagination";
import React, { Component } from "react";
import { withRouter } from "react-router-dom";
import ProjectDataService from "../services/project.service";

const FIELD_OPS = [
  { label: "=", value: "eq" },
  { label: ">", value: "gt" },
  { label: ">=", value: "gte" },
  { label: "<", value: "lt" },
  { label: "<=", value: "lte" },
  { label: "!=", value: "neq" },
  { label: "contains", value: "contains" },
];

const DEFAULT_PAGE_SIZE = 25;

class ProjectsList extends Component {
  constructor(props) {
    super(props);
    this.onChangeSearchValue = this.onChangeSearchValue.bind(this);
    this.retrieveProjects = this.retrieveProjects.bind(this);
    this.refreshList = this.refreshList.bind(this);
    this.refreshListFirstPage = this.refreshListFirstPage.bind(this);
    this.setActiveProject = this.setActiveProject.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageSizeChange = this.handlePageSizeChange.bind(this);
    this.searchOnKeyUp = this.searchOnKeyUp.bind(this);
    this.handleSearchFieldChange = this.handleSearchFieldChange.bind(this);
    this.handleSearchOpChange = this.handleSearchOpChange.bind(this);
    this.addSearchField = this.addSearchField.bind(this);
    this.removeSearchField = this.removeSearchField.bind(this);
    this.syncCurrentUrl = this.syncCurrentUrl.bind(this);

    this.state = {
      projects: [],
      // default to the project name search only
      searchFields: [
        { ...ProjectDataService.fields()[1], value: "", op: "contains" },
      ],

      page: 1,
      count: 0,
      pageSize: DEFAULT_PAGE_SIZE,
    };

    this.pageSizes = [10, 25, 50, 100];
  }

  filterStringsToSearchFieldsArray(filters) {
    // format in URL <field>__<op>__<value>
    let searchFields = [];
    filters.forEach(f=>{
      let arr = f.split("__");
      if (arr.length !== 3) return;
      // find the field
      let nf = ProjectDataService.fields().find(
        (el) => el.name === arr[0]
      );
      if (!nf) return;
      searchFields.push({...nf, op: arr[1], value: arr[2]});
    });
    return searchFields;
  }

  componentDidMount() {
    if (this.props.match.params.pageSize || this.props.match.params.page) {
      let update = {};
      if (this.props.match.params.pageSize) {
        update.pageSize = parseInt(this.props.match.params.pageSize);
      }
      if (this.props.match.params.page) {
        update.page = parseInt(this.props.match.params.page);
      }
      if (this.props.match.params.filters) {
        // format in URL <field>__<op>__<value>
        let filters = this.props.match.params.filters.split("/");
        let searchFields = this.filterStringsToSearchFieldsArray(filters);
        if (searchFields.length) update.searchFields = searchFields;
      }
      console.log('componentDidMount:: Setting page params', update);
      this.setState(update,
        () => {
          this.retrieveProjects();
        });
    } else {
      this.retrieveProjects();
    }
  }

  componentDidUpdate(prevProps) {
    console.log('componentDidUpdate:: prevProps / newProps', prevProps, this.props);
    let update = {};
    let changed = false;
    if (prevProps.match.params.pageSize !== this.props.match.params.pageSize) {
      let ps = parseInt(this.props.match.params.pageSize) || DEFAULT_PAGE_SIZE;
      if (ps !== this.state.pageSize) {
        update.pageSize = ps;
        changed = true;
      }
    }
    if (prevProps.match.params.page !== this.props.match.params.page) {
      let ps = parseInt(this.props.match.params.page) || 1;
      if (ps !== this.state.page) {
        update.page = ps;
        changed = true;
      }
    }
    if (changed) {
      console.log('componentDidUpdate:: update state', update);
      this.setState(update,
        () => {
          this.retrieveProjects();
        });
    }
  }

  searchOnKeyUp(event) {
    if (event.charCode === 13) {
      this.refreshListFirstPage();
    }
  }

  getRequestParams(searchFields, page, pageSize) {
    let params = {};

    if (searchFields && searchFields.length) {
      searchFields.forEach((e) => {
        params[`${e.name}__${e.op}`] = e.value;
      });
    }

    if (page) {
      params["page"] = page - 1;
    }

    if (pageSize) {
      params["size"] = pageSize;
    }

    console.log('getRequestParams:: params', params);
    return params;
  }

  retrieveProjects() {
    console.log('retrieveProjects:: state', this.state);
    const { searchFields, page, pageSize } = this.state;
    const params = this.getRequestParams(searchFields, page, pageSize);

    ProjectDataService.getAll(params)
      .then((response) => {
        const { projects, totalPages } = response.data;

        this.setState({
          projects: projects,
          count: totalPages,
        });
        console.log(response.data);
      })
      .catch((e) => {
        console.log(e);
      });
  }

  refreshListFirstPage() {
    this.setState({ page: 1 }, () => {
      this.syncCurrentUrl();
      this.retrieveProjects();
    });
  }

  refreshList() {
    this.syncCurrentUrl();
    this.retrieveProjects();
  }

  setActiveProject(project, index) {
    console.log("Changed active project: ", project);
    this.props.history.push(`/projects/${project.id}`);
  }

  onChangeSearchValue(event, index) {
    const val = event.target.value;
    this.setState((prevState) => ({
      searchFields: prevState.searchFields.map((el, j) =>
        j === index ? { ...el, value: val } : el
      ),
    }));
  }

  handleSearchFieldChange(event, index) {
    console.log("handleSearchFieldChange", index, event, event.target.value);
    // find the new selected field
    let nf = ProjectDataService.fields().find(
      (el) => el.name === event.target.value
    );
    this.setState((prevState) => ({
      searchFields: prevState.searchFields.map((el, j) =>
        j === index ? { ...el, name: nf.name, label: nf.label } : el
      ),
    }));
  }

  handleSearchOpChange(event, index) {
    console.log("handleSearchOpChange", index, event, event.target.value);
    this.setState((prevState) => ({
      searchFields: prevState.searchFields.map((el, j) =>
        j === index ? { ...el, op: event.target.value } : el
      ),
    }));
  }

  addSearchField(event, index) {
    console.log("addSearchField", index, event, event.target.value);
    // find the new selected field
    const nf = ProjectDataService.fields()[0];
    this.setState((prevState) => ({
      searchFields: prevState.searchFields.concat({
        ...nf,
        value: "",
        op: "contains",
      }),
    }));
  }

  removeSearchField(event, index) {
    console.log("removeSearchField", index, event, event.target.value);
    // don't remove all the fields.
    if (this.state.searchFields.length <= 1) return;
    this.setState((prevState) => ({
      searchFields: prevState.searchFields.filter((el, j) => index !== j),
    }),
    () => {
      this.refreshListFirstPage();
    });
  }

  syncCurrentUrl() {
    let fs = [];
    this.state.searchFields.forEach(f=>{
      fs.push(`${f.name}__${f.op}__${f.value}`);
    });
    console.log('syncCurrentUrl:: with filters ', fs)
    this.props.history.push(`/projects-list/${this.state.pageSize}/${this.state.page}/${fs.join("/")}`);
  }

  handlePageChange(event, value) {
    console.log('handlePageChange:: ', event, value);
    this.setState(
      {
        page: value,
      },
      () => {
        this.refreshList();
      }
    );
  }

  handlePageSizeChange(event) {
    console.log('handlePageSizeChange:: ', event);
    this.setState(
      {
        pageSize: event.target.value,
        page: 1,
      },
      () => {
        this.refreshList();
      }
    );
  }

  render() {
    const {
      searchFields,
      projects,
      page,
      count,
      pageSize,
    } = this.state;

    return (
      <div className="list row">
        <div className="col-12">
          <div className="input-group mb-3">
            {searchFields.map((sf, i) => (
              <div className="input-group mb-3" key={i}>
                <select
                  className="form-select"
                  onChange={(e) => this.handleSearchFieldChange(e, i)}
                  value={sf.name}
                >
                  {ProjectDataService.fields().map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <select
                  className="form-select"
                  onChange={(e) => this.handleSearchOpChange(e, i)}
                  value={sf.op}
                >
                  {FIELD_OPS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  className="form-control"
                  placeholder={"Search by " + sf.label}
                  value={sf.value}
                  onChange={(e) => this.onChangeSearchValue(e, i)}
                  onKeyPress={this.searchOnKeyUp}
                />
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={(e) => this.removeSearchField(e, i)}
                >
                  -
                </button>
                <button
                  className="btn btn-outline-secondary"
                  type="button"
                  onClick={(e) => this.addSearchField(e, i)}
                >
                  +
                </button>
              </div>
            ))}
            <div className="input-group-append">
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={this.refreshListFirstPage}
              >
                Search
              </button>
            </div>
          </div>
        </div>
        <div className="col-12">
          <h4>Projects List</h4>
          <ul className="list-group projects-list">
            {projects &&
              projects.map((project, index) => (
                <li
                  className="list-group-item"
                  onClick={() => this.setActiveProject(project, index)}
                  key={index}
                >
                  {project.project_name}
                </li>
              ))}
          </ul>
          <div className="row">
            <div className="col-auto">
              <Pagination
                className="my-3"
                count={count}
                page={page}
                siblingCount={1}
                boundaryCount={1}
                variant="outlined"
                shape="rounded"
                onChange={this.handlePageChange}
              />
            </div>
            <div className="col-auto my-3 row">
              <label className="col-auto col-form-label" htmlFor="pageSize">
                Items per Page:
              </label>
              <div className="col-auto">
                <select
                  id="pageSize"
                  className="form-select"
                  onChange={this.handlePageSizeChange}
                  value={pageSize}
                >
                  {this.pageSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
}

export default withRouter(ProjectsList);
