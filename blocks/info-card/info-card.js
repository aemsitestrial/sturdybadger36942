
export default function decorate(block) {
  const textTitle = block.querySelector('p').textContent;
  const textDesc = block.querySelector('p')[1].textContent;
  const linkUrl = block.querySelector('p')[2].textContent;
  const textLink = block.querySelector('p')[3].textContent;


  block.textContent = '';
 

  const locatorDOM = document.createRange().createContextualFragment(`

  <div class="info-card-content">
    <h2>${textTitle}</h2>
    <div class="desc">${textDesc}</div>
    <a href="${linkUrl}" class="button primary">${textLink}</a>
  </div>
  `);

  block.append(locatorDOM);
}


