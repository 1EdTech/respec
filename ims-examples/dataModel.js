window.dataModelTemplate = function (dataModel) {
  if (dataModel) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>${dataModel.name} Data Model</h2>
        <p>${dataModel.documentation.description}</p>`;
    return wrapper;
  }
};
