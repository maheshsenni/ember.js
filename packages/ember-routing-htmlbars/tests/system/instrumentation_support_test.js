import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import viewKeyword from 'ember-htmlbars/keywords/view';
import EmberView from 'ember-views/views/view';
import compile from 'ember-template-compiler/system/compile';
import EmberController from 'ember-runtime/controllers/controller';
import EmberComponent from 'ember-views/components/component';

import { subscribe, reset } from 'ember-metal/instrumentation';

import run from 'ember-metal/run_loop';
import {
  runAppend,
  runDestroy
} from 'ember-runtime/tests/utils';

var originalViewKeyword, view, dispatcher, innerComponent, outerComponent;

QUnit.module('ember-routing-htmlbars: actions instrumentation', {
  setup() {
    originalViewKeyword = registerKeyword('view', viewKeyword);
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    reset();
    runDestroy(view);
    runDestroy(innerComponent);
    runDestroy(outerComponent);
    runDestroy(dispatcher);
    resetKeyword('view', originalViewKeyword);
  }
});

QUnit.test('should instrument element actions without args on controllers', function() {
  expect(7);

  var actionWasHandled = false;

  var controller = EmberController.extend({
    _debugContainerKey: 'controller.test',
    actions: { elementAction() { actionWasHandled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "elementAction"}}>click</a>')
  });

  runAppend(view);

  subscribe('action', {
    before(name, time, payload) {
      strictEqual(name, 'action.controller.test.elementAction', 'first argument for before callback is action path name');
      strictEqual(payload.action, 'elementAction', 'before callback payload contains action name');
      deepEqual(payload.target, controller, 'before callback payload contains correct target');
    },
    after(name, time, payload) {
      strictEqual(name, 'action.controller.test.elementAction', 'first argument for after callback is action path name');
      strictEqual(payload.action, 'elementAction', 'after callback payload contains action name');
      deepEqual(payload.target, controller, 'after callback payload contains correct target');
    }
  });

  view.$('a').trigger('click');

  ok(actionWasHandled, 'action handler was called');
});

QUnit.test('should instrument element actions with args on controllers', function() {
  expect(5);

  var actionWasHandled = false;

  var controller = EmberController.extend({
    actions: { elementAction() { actionWasHandled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "elementAction" "test"}}>click</a>')
  });

  runAppend(view);

  subscribe('action', {
    before(name, time, payload) {
      strictEqual(payload.args.length, 1, 'before callback payload contains action arguments');
      strictEqual(payload.args[0], 'test', 'before callback payload contains action arguments');
    },
    after(name, time, payload) {
      strictEqual(payload.args.length, 1, 'after callback payload contains action arguments');
      strictEqual(payload.args[0], 'test', 'after callback payload contains action arguments');
    }
  });

  view.$('a').trigger('click');

  ok(actionWasHandled, 'action handler was called');
});

QUnit.test('should instrument element actions without args on components', function() {
  expect(4);

  var actionWasHandled = false;

  var component = EmberComponent.extend({
    id: 123,
    _debugContainerKey: 'component.test',
    layout: compile('<a href="#" {{action "componentAction"}}>click</a>'),
    actions: { componentAction() { actionWasHandled = true; } }
  });

  view = EmberView.create({
    controller: {
      component: component
    },
    template: compile('{{view component}}')
  });

  runAppend(view);

  subscribe('action', {
    before(name, time, payload) {
      ok(true, 'action was instrumented');
      strictEqual(name, 'action.component.test.componentAction', 'first argument for before callback is action path name');
      // check why deepEqual comparison is not working
      // deepEqual(payload.target, component, 'before callback payload contains correct target');
      strictEqual(payload.target.get('id'), 123, 'before callback payload contains correct target');
    },
    after() {}
  });

  run(function() {
    view.$('a').trigger('click');
  });

  ok(actionWasHandled, 'action handler was called');
});

QUnit.test('should instrument element actions with args on components', function() {
  expect(4);

  var actionWasHandled = false;

  var component = EmberComponent.extend({
    layout: compile('<a href="#" {{action "componentAction" "test"}}>click</a>'),
    actions: { componentAction() { actionWasHandled = true; } }
  });

  view = EmberView.create({
    controller: {
      component: component
    },
    template: compile('{{view component}}')
  });

  runAppend(view);

  subscribe('action', {
    before(name, time, payload) {
      ok(true, 'action was instrumented');
      strictEqual(payload.args.length, 1, 'before callback payload contains correct number of action arguments');
      strictEqual(payload.args[0], 'test', 'before callback payload contains action arguments');
    },
    after() {}
  });

  run(function() {
    view.$('a').trigger('click');
  });

  ok(actionWasHandled, 'action handler was called');
});

QUnit.test('should instrument closure actions without args', function() {
  expect(4);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    _debugContainerKey: 'component.test',
    layout: compile('{{view innerComponent submit=(action outerSubmit)}}'),
    innerComponent,
    outerSubmit() {
      ok(true, 'action is called');
    }
  }).create();

  runAppend(outerComponent);

  subscribe('action', {
    before(name, time, payload) {
      ok(true, 'action was instrumented');
      strictEqual(name, 'action.component.test.closure', 'first argument for before callback is action path name');
      deepEqual(payload.target, outerComponent, 'before callback payload contains correct target');
    },
    after() {}
  });

  run(function() {
    innerComponent.fireAction();
  });
});

QUnit.test('should instrument closure actions with args', function() {
  expect(4);

  innerComponent = EmberComponent.extend({
    fireAction() {
      this.attrs.submit();
    }
  }).create();

  outerComponent = EmberComponent.extend({
    layout: compile('{{view innerComponent submit=(action outerSubmit "test")}}'),
    innerComponent,
    outerSubmit() {
      ok(true, 'action is called');
    }
  }).create();

  runAppend(outerComponent);

  subscribe('action', {
    before(name, time, payload) {
      ok(true, 'action was instrumented');
      strictEqual(payload.args.length, 1, 'before callback payload contains correct number of action arguments');
      strictEqual(payload.args[0], 'test', 'before callback payload contains action arguments');
    },
    after() {}
  });

  run(function() {
    innerComponent.fireAction();
  });
});

QUnit.test('should instrument closure actions with curried args', function(assert) {
  expect(4);

  const first = 'mitch';
  const second =  'martin';

  innerComponent = EmberComponent.extend({
    _debugContainerKey: 'component.innerComponent',
    layout: compile('<a href="#" {{action "fireAction"}}>click</a>'),
    actions: {
      fireAction() {
        this.attrs.submit(second);
      }
    }
  }).create();

  outerComponent = EmberComponent.extend({
    _debugContainerKey: 'component.outerComponent',
    layout: compile(`
        {{view innerComponent submit=(action outerSubmit "${first}")}}
      `),
    innerComponent,
    outerSubmit(actualFirst, actualSecond, actualThird, actualFourth) {
      // do nothing
    }
  }).create();

  runAppend(outerComponent);

  subscribe('action', {
    before(name, time, payload) {
      // callback will be called twice
      // 1. For innerComponent element action - fireAction
      // 2. For outerComponent closure called from innerComponent's "fireAction"
      if (name === 'action.component.outerComponent.closure') {
        strictEqual(payload.args.length, 2, 'before callback for closure contains correct number of action arguments');
        strictEqual(payload.args[0], first, 'before callback for closure contains curried argument 1');
        strictEqual(payload.args[1], second, 'before callback for closure contains curried argument 2');
      } else if (name === 'action.component.innerComponent.fireAction') {
        ok(true, 'inner component action was called');
      }
    },
    after() {}
  });

  run(function() {
    outerComponent.$('a').trigger('click');
  });
});
