 import * as httpUtil from '../utils/http';
 import * as modalUtil from '../utils/modals';

 export function initToolbar(_context) {
    const context = _context;
    // TOOLBAR-REMOVE
    $('.js-toolbar-remove').click(function(e) {
      e.preventDefault();
      const url = $(this).attr('data-record-id').replace('/', '');
      modalUtil.confirmDialog({
        sTitle: 'Ta bort?',
        sContent: 'Du kan inte ångra detta val.',
        sAccept: 'OK',
        sReject: 'Avbryt',
        sType: 'danger' }).then(() => {
          // accepted by user
          httpUtil._delete(url, context.access_token).then((result) => {
            console.log("post WAS deleted...", result);
          }, (result) => {
            console.log("post was NOT deleted...", result);
          });
        }, () => {
        // rejected by user
      });
    });

    $('.js-toolbar-marc').click(function(e) {
      e.preventDefault();
      function showModal(result) {
        let content = '';
        // !TODO add general error message display for all xhr-requests
        if(result.name === 'Error') {
          content = `Failed to convert to MARC: ${result}`
        } else {
          content = `<section class="marc-code">
                      <table>
                        <tr>
                          <td data-ng-if="record.leader">
                            <code>000</code>
                          </td>
                          <td></td>
                          <td></td>
                          <td colspan="3">
                            <span>{{record.leader}}</span>
                          </td>
                        </tr>
                        <tr>
                          <td>
                            <code>{{key}}</code>
                          </td>
                          <td class="ind">
                            {{value.ind1}}
                          </td>
                          <td class="ind">
                            {{value.ind2}}
                          </td>
                          <td>
                            <span>{{value}}</span>
                            <span>{{value.subfields}}</span>
                          </td>
                        </tr>
                      </table>
                    </section>`;
        }
        modalUtil.modal({
          sTitle: 'MARC Vy',
          sContent: content
        }).then(() => {}, () => {});;
      }
      context.vm.convertItemToMarc().then(showModal, showModal);
    });
  }