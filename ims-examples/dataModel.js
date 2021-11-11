// @ts-check

window.dataModelTemplate = function (dataModel) {
  console.log("dataModel modelData", dataModel);
  if (dataModel) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = `<h2>${dataModel.name} Data Model 2</h2>
        <p>${dataModel.documentation.description}</p>`;
    return wrapper;
  }
};
