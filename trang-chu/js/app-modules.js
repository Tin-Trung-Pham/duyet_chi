/* Sổ Đề Nghị Chi – Module 5: nối 4 module thật vào khung ứng dụng.
 * Chỉ GỌI API công khai của các module (không sửa mã của chúng). Cần nạp trước các tệp JS của:
 *   nhap-lieu (DncModel, DncStore, DncEntry), duyet (DncReviewModel, DncReviewStore, DncReview),
 *   thong-ke (DncStatsModel, DncStatsStore, DncStats), nhan-vien (DncEmpModel, DncEmpStore, DncEmployees).
 */
(function (root) {
  'use strict';

  function real(storage) {
    return {
      'nhap-lieu': {
        mount: function (el, ctx) {
          var edit = ctx.params[0] === 'sua' && ctx.params[1];
          return root.DncEntry.mount(el, {
            store: root.DncStore.create({ storage: storage }), session: ctx.session,
            mode: edit ? 'edit' : 'add', id: edit ? ctx.params[1] : undefined,
            onSaved: function () { ctx.notifyChanged(); },
            onCancel: function () { ctx.navigate('/'); }
          });
        }
      },
      'duyet': {
        mount: function (el, ctx) {
          return root.DncReview.mount(el, {
            store: root.DncReviewStore.create({ storage: storage }), session: ctx.session,
            onChanged: function () { ctx.notifyChanged(); }, onForbidden: function () { ctx.forbidden(); }
          });
        }
      },
      'thong-ke': {
        mount: function (el, ctx) {
          return root.DncStats.mount(el, { store: root.DncStatsStore.create({ storage: storage }), session: ctx.session, onForbidden: function () { ctx.forbidden(); } });
        }
      },
      'nhan-vien': {
        mount: function (el, ctx) {
          return root.DncEmployees.mount(el, {
            store: root.DncEmpStore.create({ storage: storage }), session: ctx.session,
            onChanged: function () { ctx.notifyChanged(); }, onForbidden: function () { ctx.forbidden(); }
          });
        }
      }
    };
  }

  root.DncAppModules = { real: real };
})(typeof window !== 'undefined' ? window : this);
